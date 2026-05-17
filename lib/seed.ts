// // lib/seed.ts

// import { getDB } from "./db";

// export async function seedDatabase() {
//   const db = await getDB();

//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS products (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       category TEXT,
//       name TEXT,
//       description TEXT,
//       price TEXT,
//       image TEXT,
//       customizable INTEGER
//     )
//   `);

//   const existing = await db.get(
//     `SELECT COUNT(*) as count FROM products`
//   );

//   if (existing.count > 0) return;

//   const products = [
//     // Personalized Gifts
//     {
//       category: "personalized-gifts",
//       name: "Custom Mini Figurine",
//       description:
//         "Personalized 3D printed mini character based on your photo.",
//       price: "₹1499",
//       image:
//         "https://images.unsplash.com/photo-1521572267360-ee0c2909d518",
//       customizable: 1
//     },
//     {
//       category: "personalized-gifts",
//       name: "Spotify Plaque",
//       description:
//         "Custom Spotify music plaque with your favorite song.",
//       price: "₹799",
//       image:
//         "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
//       customizable: 1
//     },
//     {
//       category: "personalized-gifts",
//       name: "Name Lamp",
//       description:
//         "LED personalized name lamp for gifting.",
//       price: "₹999",
//       image:
//         "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
//       customizable: 1
//     },
//     {
//       category: "personalized-gifts",
//       name: "Couple Statue",
//       description:
//         "Romantic personalized couple sculpture.",
//       price: "₹1999",
//       image:
//         "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
//       customizable: 1
//     },

//     // Home Decor
//     {
//       category: "home-decor",
//       name: "Modern Vase",
//       description:
//         "Elegant geometric 3D printed vase.",
//       price: "₹699",
//       image:
//         "https://images.unsplash.com/photo-1493666438817-866a91353ca9",
//       customizable: 0
//     },
//     {
//       category: "home-decor",
//       name: "Wall Art",
//       description:
//         "Minimal wall decor inspired by modern interiors.",
//       price: "₹1299",
//       image:
//         "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85",
//       customizable: 0
//     },
//     {
//       category: "home-decor",
//       name: "Moon Lamp",
//       description:
//         "Aesthetic moon lamp for bedrooms.",
//       price: "₹899",
//       image:
//         "https://images.unsplash.com/photo-1513694203232-719a280e022f",
//       customizable: 0
//     },
//     {
//       category: "home-decor",
//       name: "Desk Sculpture",
//       description:
//         "Artistic desk sculpture with premium finish.",
//       price: "₹599",
//       image:
//         "https://images.unsplash.com/photo-1518770660439-4636190af475",
//       customizable: 0
//     },

//     // Educational
//     {
//       category: "educational-student",
//       name: "Human Heart Model",
//       description:
//         "Detailed anatomy model for students.",
//       price: "₹899",
//       image:
//         "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b",
//       customizable: 0
//     },
//     {
//       category: "educational-student",
//       name: "Solar System Kit",
//       description:
//         "Educational planetary display model.",
//       price: "₹1299",
//       image:
//         "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa",
//       customizable: 0
//     },
//     {
//       category: "educational-student",
//       name: "DNA Structure",
//       description:
//         "3D DNA model for biology learning.",
//       price: "₹999",
//       image:
//         "https://images.unsplash.com/photo-1532187643603-ba119ca4109e",
//       customizable: 0
//     },
//     {
//       category: "educational-student",
//       name: "Desk Organizer",
//       description:
//         "Functional organizer for students.",
//       price: "₹499",
//       image:
//         "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
//       customizable: 0
//     },

//     // Functional
//     {
//       category: "functional-products",
//       name: "Cable Organizer",
//       description:
//         "Minimal cable management solution.",
//       price: "₹299",
//       image:
//         "https://images.unsplash.com/photo-1516321318423-f06f85e504b3",
//       customizable: 0
//     },
//     {
//       category: "functional-products",
//       name: "Phone Stand",
//       description:
//         "Adjustable premium phone stand.",
//       price: "₹399",
//       image:
//         "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9",
//       customizable: 0
//     },
//     {
//       category: "functional-products",
//       name: "Headphone Holder",
//       description:
//         "Modern headphone desk mount.",
//       price: "₹499",
//       image:
//         "https://images.unsplash.com/photo-1505740420928-5e560c06d30e",
//       customizable: 0
//     },
//     {
//       category: "functional-products",
//       name: "Key Holder",
//       description:
//         "Wall-mounted stylish key holder.",
//       price: "₹599",
//       image:
//         "https://images.unsplash.com/photo-1519710164239-da123dc03ef4",
//       customizable: 0
//     }
//   ];

//   for (const product of products) {
//     await db.run(
//       `
//       INSERT INTO products
//       (category, name, description, price, image, customizable)
//       VALUES (?, ?, ?, ?, ?, ?)
//     `,
//       [
//         product.category,
//         product.name,
//         product.description,
//         product.price,
//         product.image,
//         product.customizable
//       ]
//     );
//   }
// }