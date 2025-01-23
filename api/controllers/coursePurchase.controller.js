import Stripe from "stripe";
import { Course } from "../models/course.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";
import { User } from "../models/user.model.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    // Create a new course purchase record
    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      amount: course.coursePrice,
      status: "pending",
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"], // Payment methods jo allow hain (e.g. card payments)
      line_items: [
        {
          price_data: {
            currency: "pkr", // Currency INR (Indian Rupees)
            product_data: {
              name: course.courseTitle, // Course ka naam Stripe checkout page pe show hoga
              images: [course.courseThumbnail], // Course ki image show karne ke liye
            },
            unit_amount: course.coursePrice * 100, // Price (paise me convert kiya gaya hai)
          },
          quantity: 1, // Ek item purchase ho rahi hai
        },
      ],
      mode: "payment", // Payment mode (one-time payment)
      success_url: `${process.env.CLIENT_URL}/course-progress/${courseId}`,
      cancel_url: `${process.env.CLIENT_URL}/course-detail/${courseId}`,
      metadata: {
        courseId: courseId, // Extra data store karne ke liye
        userId: userId,     // Payment ke sath user ka ID store ho raha hai
      },
      shipping_address_collection: {
        allowed_countries: ["PK"], // Sirf India allow kiya gaya hai shipping ke liye
      },
    });

    if (!session.url) {
      return res
        .status(400)
        .json({ success: false, message: "Error while creating session" });
    };

    // Save the purchase record
    newPurchase.paymentId = session.id;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      url: session.url, // Return the Stripe checkout URL
    });
  } catch (error) {
    console.log(error);
  }
};

export const stripeWebhook = async (req, res) => {
  let event;

  try {
    // Request body ko JSON string mein convert kar rahe hain
    const payloadString = JSON.stringify(req.body, null, 2);

    // Secret key jo Stripe webhook request ko verify karne ke liye use hoti hai
    const secret = process.env.WEBHOOK_ENDPOINT_SECRET;

    // Test header generate karna (sirf testing ke liye)
    const header = stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret,
    });

    // Webhook request ko verify aur construct karna
    event = stripe.webhooks.constructEvent(payloadString, header, secret);
  } catch (error) {
    console.error("Webhook error:", error.message);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }

  // Jab payment successful ho jaye
  if (event.type === "checkout.session.completed") {
    console.log("check session complete is called");

    try {
      // Stripe ke event se session object ko extract karna
      const session = event.data.object;

      // Database mein payment ID se purchase details dhoondhna
      const purchase = await CoursePurchase.findOne({
        paymentId: session.id,
      }).populate({ path: "courseId" });

      // Agar purchase record nahi mila toh error bhejna
      if (!purchase) {
        return res.status(404).json({ message: "Purchase not found" });
      }

      // Payment amount ko database mein update karna
      if (session.amount_total) {
        purchase.amount = session.amount_total / 100;  // USD ko cents se dollars mein convert kar rahe hain
      }
      purchase.status = "completed";  // Payment status update karna

      // Course ke lectures sab users ke liye unlock karna
      if (purchase.courseId && purchase.courseId.lectures.length > 0) {
        await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { isPreviewFree: true } }  // Har lecture ko free preview bana rahe hain
        );
      }

      await purchase.save();  // Updated purchase ko save karna

      // User ke enrolled courses list ko update karna
      await User.findByIdAndUpdate(
        purchase.userId,
        { $addToSet: { enrolledCourses: purchase.courseId._id } }, // Naya course add karna
        { new: true }
      );

      // Course ke enrolled students list ko update karna
      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents: purchase.userId } }, // Naya student add karna
        { new: true }
      );

    } catch (error) {
      console.error("Error handling event:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  res.status(200).send();  // Successfully response dena
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    const purchased = await CoursePurchase.findOne({ userId, courseId });

    if (!course) {
      return res.status(404).json({ message: "course not found!" });
    };

    return res.status(200).json({
      course,
      purchased: !!purchased, // true if purchased, false otherwise
    });
  } catch (error) {
    console.log(error);
  };
};

export const getAllPurchasedCourse = async (_, res) => {
  try {
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
    }).populate("courseId");

    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    };

    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.log(error);
  }
};