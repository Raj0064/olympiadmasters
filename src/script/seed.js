import { db, auth } from "../firebase";
import { doc, setDoc, addDoc, collection, Timestamp } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

const seedDatabase = async () => {
  try {
    console.log("🌱 Seeding started...");

    // ─── Step 1 — Create Admin Auth + Firestore ──────────────
    const adminCred = await createUserWithEmailAndPassword(
      auth,
      "admin@olympiad.com",
      "admin123"
    );

    await setDoc(doc(db, "users", adminCred.user.uid), {
      name: "Admin",
      email: "admin@olympiad.com",
      role: "admin",
      grade: 0,
      batchId: "",
    });

    console.log("✅ Admin created");

    // ─── Step 2 — Create Student Auth + Firestore ────────────
    const studentCred = await createUserWithEmailAndPassword(
      auth,
      "student@olympiad.com",
      "student123"
    );

    await setDoc(doc(db, "users", studentCred.user.uid), {
      name: "Rahul Sharma",
      email: "student@olympiad.com",
      role: "student",
      grade: 6,
      batchId: "batch_01",
    });

    console.log("✅ Student created");

    // ─── Step 3 — Create Batch ────────────────────────────────
    await setDoc(doc(db, "batches", "batch_01"), {
      name: "Grade 6 - Batch A",
      grade: 6,
      studentIds: [studentCred.user.uid],
      examIds: ["exam_001"],
    });

    console.log("✅ Batch created");

    // ─── Step 4 — Create Exam ─────────────────────────────────
    await setDoc(doc(db, "exams", "exam_001"), {
      title: "Olympiad Maths — Grade 6",
      duration: 60,
      grade: 6,
      batchIds: ["batch_01"],
      isActive: true,
      isResultPublished: false,
      scheduledAt: Timestamp.fromDate(
        new Date(Date.now() - 24 * 60 * 60 * 1000)
      ), // yesterday
      windowEnd: Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ), // 1 week later
      sections: [
        { id: "sec_a", label: "Section A", marks: 1 },
        { id: "sec_b", label: "Section B", marks: 2 },
        { id: "sec_c", label: "Section C", marks: 3 },
      ],
    });

    console.log("✅ Exam created");

    // ─── Step 5 — Create Questions ────────────────────────────
    const questions = [
      {
        examId: "exam_001",
        sectionId: "sec_a",
        order: 1,
        text: "If the sum of two numbers is 24 and their difference is 8, find the larger number.",
        options: { A: "12", B: "16", C: "18", D: "20" },
        correctAnswer: "B",
        explanation:
          "Let numbers be x and y. x+y=24, x-y=8. Adding: 2x=32, x=16.",
        marks: 1,
        imageUrl: "",
      },
      {
        examId: "exam_001",
        sectionId: "sec_a",
        order: 2,
        text: "What is the LCM of 12 and 18?",
        options: { A: "24", B: "36", C: "48", D: "72" },
        correctAnswer: "B",
        explanation: "12 = 2²×3, 18 = 2×3². LCM = 2²×3² = 36.",
        marks: 1,
        imageUrl: "",
      },
      {
        examId: "exam_001",
        sectionId: "sec_b",
        order: 3,
        text: "The perimeter of a rectangle is 48cm. If its length is 14cm, find its area.",
        options: { A: "120 cm²", B: "130 cm²", C: "140 cm²", D: "150 cm²" },
        correctAnswer: "C",
        explanation:
          "Perimeter = 2(l+b). 48 = 2(14+b). b=10. Area = 14×10 = 140 cm².",
        marks: 2,
        imageUrl: "",
      },
      {
        examId: "exam_001",
        sectionId: "sec_b",
        order: 4,
        text: "A triangle has angles in ratio 2:3:4. Find the largest angle.",
        options: { A: "60°", B: "70°", C: "80°", D: "90°" },
        correctAnswer: "C",
        explanation: "2x+3x+4x=180. 9x=180. x=20. Largest = 4×20 = 80°.",
        marks: 2,
        imageUrl: "",
      },
      {
        examId: "exam_001",
        sectionId: "sec_c",
        order: 5,
        text: "If 3x + 7 = 28, what is the value of 5x - 4?",
        options: { A: "31", B: "33", C: "35", D: "37" },
        correctAnswer: "A",
        explanation: "3x+7=28. 3x=21. x=7. 5x-4 = 35-4 = 31.",
        marks: 3,
        imageUrl: "",
      },
      {
        examId: "exam_001",
        sectionId: "sec_c",
        order: 6,
        text: "A train travels 360km in 4 hours. How long will it take to travel 540km at the same speed?",
        options: { A: "5 hours", B: "6 hours", C: "7 hours", D: "8 hours" },
        correctAnswer: "B",
        explanation: "Speed = 360/4 = 90km/h. Time = 540/90 = 6 hours.",
        marks: 3,
        imageUrl: "",
      },
    ];

    for (const question of questions) {
      await addDoc(collection(db, "questions"), question);
    }

    console.log("✅ Questions created");
    console.log("🎉 Seeding complete!");
    console.log("─────────────────────────────");
    console.log("Admin    → admin@olympiad.com / admin123");
    console.log("Student  → student@olympiad.com / student123");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  }
};

export default seedDatabase;
