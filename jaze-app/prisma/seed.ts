import { PrismaClient, Role } from "@prisma/client";
import { hashPassword, validatePasswordComplexity } from "../lib/admin-security";
import { databaseUrlWithTls, env } from "../lib/env";

// Vérification que le client Prisma est bien généré
let prisma: PrismaClient;
try {
  prisma = new PrismaClient({
    datasources: { db: { url: databaseUrlWithTls } },
  });

  // Test pour vérifier que le client est fonctionnel
  if (typeof prisma.user?.upsert !== "function") {
    throw new Error("Client Prisma non généré");
  }
} catch (error) {
  console.error("\n❌ Erreur d'initialisation du client Prisma.");
  console.error("   Le client n'a pas été généré ou est corrompu.\n");
  console.error("   Solution:");
  console.error("   1. npx prisma generate");
  console.error("   2. npm run seed\n");
  if (error instanceof Error && error.message !== "Client Prisma non généré") {
    console.error("   Détail:", error.message);
  }
  process.exit(1);
}

async function main() {
  console.log("🌱 Seeding database...");

  const adminEmail = env.ADMIN_EMAIL;
  const adminPassword = env.ADMIN_PASSWORD;
  const adminTotpSecret = env.ADMIN_TOTP_SECRET;

  if (adminEmail && adminPassword) {
    if (!validatePasswordComplexity(adminPassword)) {
      throw new Error(
        "ADMIN_PASSWORD ne respecte pas la politique de complexité (12+ car., majuscules, minuscules, chiffres, caractère spécial)."
      );
    }

    const passwordHash = await hashPassword(adminPassword);

    await prisma.user.upsert({
      where: { email: adminEmail.toLowerCase() },
      update: {
        passwordHash,
        role: Role.admin,
        passwordUpdatedAt: new Date(),
      },
      create: {
        email: adminEmail.toLowerCase(),
        name: "Administrateur",
        passwordHash,
        role: Role.admin,
        passwordUpdatedAt: new Date(),
      },
    });

    if (adminTotpSecret) {
      await prisma.user.update({
        where: { email: adminEmail.toLowerCase() },
        data: { totpSecret: adminTotpSecret, totpEnabled: true },
      });
      console.log("✅ Compte administrateur provisionné (2FA activable)");
    } else {
      console.log("✅ Compte administrateur provisionné (sans 2FA)");
    }
  } else {
    console.warn(
      "⚠️ Variables ADMIN_EMAIL/ADMIN_PASSWORD manquantes : aucun compte admin créé"
    );
  }

  // 1. L'artiste (upsert pour éviter les doublons)
  const existingArtist = await prisma.artist.findFirst({
    where: { name: "Jaze Baqti" },
  });

  const jaze = existingArtist
    ? existingArtist
    : await prisma.artist.create({
        data: {
          name: "Jaze Baqti",
          bio: "Artiste indépendant",
          imageUrl: "/images/jaze.jpg",
          instagramUrl: "https://www.instagram.com/jaze.baqti/",
          soundcloudUrl: "https://soundcloud.com/jaze-baqti",
          bandcampUrl: "https://jazebaqti.bandcamp.com",
          deviantartUrl: "https://deviantart.com/jazebaqti",
          websiteUrl: "https://jazebaqti.com",
          emailContact: "contact@jazebaqti.com",
        },
      });

  if (existingArtist) {
    console.log("✅ Artiste existant trouvé");
  } else {
    console.log("✅ Artiste créé");
  }

  // 2. Exemple d'album (vérifie si existe déjà)
  const existingAlbum = await prisma.album.findFirst({
    where: { title: "Introducing Jaze Baqti", artistId: jaze.id },
    include: { tracks: true },
  });

  if (existingAlbum) {
    console.log("✅ Album existant trouvé (seed ignoré pour éviter doublons)");
    console.log("✔ Seed terminé !");
    console.log({ jaze, album: existingAlbum });
    return;
  }

  const album = await prisma.album.create({
    data: {
      artistId: jaze.id,
      title: "Introducing Jaze Baqti",
      releaseYear: 2012,
      coverUrl: "/images/albums/introducingjazebaqti.jpg",

      tracks: {
        create: [
          {
            title: "Diggin' Deeper",
            trackNumber: 1,
            durationSeconds: 198,
            audioUrl:
              "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 01 Diggin' Deeper.mp3",
            isExplicit: false,
          },
          {
            title: "Paper Tiger",
            trackNumber: 2,
            durationSeconds: 136,
            audioUrl:
              "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 02 Paper Tiger.mp3",
            isExplicit: false,
          },
          {
            title: "Jungle Soul",
            trackNumber: 3,
            durationSeconds: 117,
            audioUrl:
              "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 03 Jungle Soul.mp3",
            isExplicit: false,
          },
          {
            title: "Amen",
            trackNumber: 4,
            durationSeconds: 234,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 04 Amen.mp3",
            isExplicit: false,
          },
          {
            title: "Breakthrough",
            trackNumber: 5,
            durationSeconds: 206,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 05 Breakthrough.mp3",
            isExplicit: false,
          },
          {
            title: "Black Disciple (Interlude)",
            trackNumber: 6,
            durationSeconds: 40,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 06 Black Disciple (Interlude).mp3",
            isExplicit: false,
          },
          {
            title: "Body & Soul",
            trackNumber: 7,
            durationSeconds: 120,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 07 Body & Soul.mp3",
            isExplicit: false,
          },
          {
            title: "A Whole New Thing",
            trackNumber: 8,
            durationSeconds: 159,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 08 A Whole New Thing.mp3",
            isExplicit: false,
          },
          {
            title: "Ethiopian Spirit",
            trackNumber: 9,
            durationSeconds: 147,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 09 Ethiopian Spirit.mp3",
            isExplicit: false,
          },
          {
            title: "Free Again",
            trackNumber: 10,
            durationSeconds: 151,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 10 Free Again.mp3",
            isExplicit: false,
          },
          {
            title: "Les Fleurs",
            trackNumber: 11,
            durationSeconds: 162,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 11 Les Fleurs.mp3",
            isExplicit: false,
          },
          {
            title: "Planet Earth (Interlude)",
            trackNumber: 12,
            durationSeconds: 42,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 12 Planet Earth (Interlude).mp3",
            isExplicit: false,
          },
           {
            title: "No Greater Love",
            trackNumber: 13,
            durationSeconds: 112,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 13 No Greater Love.mp3",
            isExplicit: false,
          },
           {
            title: "Let The Music Take Your Mind",
            trackNumber: 14,
            durationSeconds: 94,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 14 Let The Music Take Your Mind.mp3",
            isExplicit: false,
          },
           {
            title: "Cash Box",
            trackNumber: 15,
            durationSeconds: 90,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 15 Cash Box.mp3",
            isExplicit: false,
          },
           {
            title: "Omniscience",
            trackNumber: 16,
            durationSeconds: 182,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 16 Omniscience.mp3",
            isExplicit: false,
          },
           {
            title: "Simply Said",
            trackNumber: 17,
            durationSeconds: 101,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 17 Simply Said.mp3",
            isExplicit: false,
          },
           {
            title: "Running (Interlude)",
            trackNumber: 18,
            durationSeconds: 50,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 18 Running (Interlude).mp3",
            isExplicit: false,
          },
          {
            title: "Sentimental Journey",
            trackNumber: 19,
            durationSeconds: 222,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 19 Sentimental Journey.mp3",
            isExplicit: false,
          },
          {
            title: "Dreamin'",
            trackNumber: 20,
            durationSeconds: 149,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 20 Dreamin'.mp3",
            isExplicit: false,
          },
          {
            title: "Soul Preachin'",
            trackNumber: 21,
            durationSeconds: 58,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 21 Soul Preachin'.mp3",
            isExplicit: false,
          },
          {
            title: "Somewhere",
            trackNumber: 22,
            durationSeconds: 169,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 22 Somewhere.mp3",
            isExplicit: false,
          },
          {
            title: "Sunshine",
            trackNumber: 23,
            durationSeconds: 165,
            audioUrl: "/audio/introducingjazebaqti/Jaze Baqti - Introducing Jaze Baqti - 23 Sunshine.mp3",
            isExplicit: false,
          },

        ],
      },
    },
    include: {
      tracks: true,
    },
  });

  console.log("✔ Seed terminé !");
  console.log({ jaze, album });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
