import { Request, Response } from "express";
import { pool } from "../db";

export const identifyContact = async (req: Request, res: Response) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({
      message: "At least email or phoneNumber must be provided",
    });
  }

  const connection = await pool.getConnection();

  try {
   
    const [matchedRows]: any = await connection.query(
      `
      SELECT * FROM contact
      WHERE (email = ? OR phoneNumber = ?)
      AND deletedAt IS NULL
      ORDER BY createdAt ASC
      `,
      [email ?? null, phoneNumber ?? null]
    );


    if (matchedRows.length === 0) {
      const [result]: any = await connection.query(
        `
        INSERT INTO contact (email, phoneNumber, linkPrecedence)
        VALUES (?, ?, 'primary')
        `,
        [email ?? null, phoneNumber ?? null]
      );

      return res.status(200).json({
        contact: {
          primaryContactId: result.insertId,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }


    let primaryContacts = matchedRows.filter(
      (c: any) => c.linkPrecedence === "primary"
    );

    // If only secondaries matched, fetch their primary
    if (primaryContacts.length === 0) {
      const primaryIds = [
        ...new Set(matchedRows.map((c: any) => c.linkedId).filter(Boolean)),
      ];

      const [primaryRows]: any = await connection.query(
        `SELECT * FROM contact WHERE id IN (?)`,
        [primaryIds]
      );

      primaryContacts = primaryRows;
    }

    const oldestPrimary = primaryContacts.sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    )[0];

  
    for (const contact of primaryContacts) {
      if (contact.id !== oldestPrimary.id) {
        await connection.query(
          `
          UPDATE contact
          SET linkPrecedence = 'secondary',
              linkedId = ?
          WHERE id = ?
          `,
          [oldestPrimary.id, contact.id]
        );
      }
    }

  
    const [allContacts]: any = await connection.query(
      `
      SELECT * FROM contact
      WHERE (id = ? OR linkedId = ?)
      AND deletedAt IS NULL
      ORDER BY createdAt ASC
      `,
      [oldestPrimary.id, oldestPrimary.id]
    );

    const existingEmails = [
      ...new Set(allContacts.map((c: any) => c.email).filter(Boolean)),
    ];

    const existingPhones = [
      ...new Set(allContacts.map((c: any) => c.phoneNumber).filter(Boolean)),
    ];


    if (
      (email && !existingEmails.includes(email)) ||
      (phoneNumber && !existingPhones.includes(phoneNumber))
    ) {
      await connection.query(
        `
        INSERT INTO contact (email, phoneNumber, linkPrecedence, linkedId)
        VALUES (?, ?, 'secondary', ?)
        `,
        [email ?? null, phoneNumber ?? null, oldestPrimary.id]
      );
    }

    const [finalContacts]: any = await connection.query(
      `
      SELECT * FROM contact
      WHERE (id = ? OR linkedId = ?)
      AND deletedAt IS NULL
      ORDER BY createdAt ASC
      `,
      [oldestPrimary.id, oldestPrimary.id]
    );

    const emails = [
      ...new Set(finalContacts.map((c: any) => c.email).filter(Boolean)),
    ];

    const phoneNumbers = [
      ...new Set(finalContacts.map((c: any) => c.phoneNumber).filter(Boolean)),
    ];

    const secondaryContactIds = finalContacts
      .filter((c: any) => c.linkPrecedence === "secondary")
      .map((c: any) => c.id);

    return res.status(200).json({
      contact: {
        primaryContactId: oldestPrimary.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  } finally {
    connection.release();
  }
};