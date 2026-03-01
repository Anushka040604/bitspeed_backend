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
    // 1️⃣ Find matching contacts
    const [matchedRows]: any = await connection.query(
      `
      SELECT * FROM Contact
      WHERE (email = ? OR phoneNumber = ?)
      AND deletedAt IS NULL
      ORDER BY createdAt ASC
      `,
      [email ?? null, phoneNumber ?? null]
    );

    // 2️⃣ If none found → create primary
    if (matchedRows.length === 0) {
      const [result]: any = await connection.query(
        `
        INSERT INTO Contact (email, phoneNumber, linkPrecedence)
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

    // 3️⃣ Determine all related contact IDs
    let primaryContacts = matchedRows.filter(
      (c: any) => c.linkPrecedence === "primary"
    );

    // If only secondaries matched, fetch their primary
    if (primaryContacts.length === 0) {
      const primaryIds = [
        ...new Set(matchedRows.map((c: any) => c.linkedId).filter(Boolean)),
      ];

      const [primaryRows]: any = await connection.query(
        `SELECT * FROM Contact WHERE id IN (?)`,
        [primaryIds]
      );

      primaryContacts = primaryRows;
    }

    // 4️⃣ Find oldest primary
    const oldestPrimary = primaryContacts.sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() -
        new Date(b.createdAt).getTime()
    )[0];

    // 5️⃣ Merge multiple primaries if needed
    for (const contact of primaryContacts) {
      if (contact.id !== oldestPrimary.id) {
        await connection.query(
          `
          UPDATE Contact
          SET linkPrecedence = 'secondary',
              linkedId = ?
          WHERE id = ?
          `,
          [oldestPrimary.id, contact.id]
        );
      }
    }

    // 6️⃣ Fetch all contacts related to oldestPrimary
    const [allContacts]: any = await connection.query(
      `
      SELECT * FROM Contact
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

    // 7️⃣ If new info provided → create secondary
    if (
      (email && !existingEmails.includes(email)) ||
      (phoneNumber && !existingPhones.includes(phoneNumber))
    ) {
      await connection.query(
        `
        INSERT INTO Contact (email, phoneNumber, linkPrecedence, linkedId)
        VALUES (?, ?, 'secondary', ?)
        `,
        [email ?? null, phoneNumber ?? null, oldestPrimary.id]
      );
    }

    // 8️⃣ Fetch again after possible insert
    const [finalContacts]: any = await connection.query(
      `
      SELECT * FROM Contact
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