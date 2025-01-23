import { User } from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../utils/generateToken.js";
import { deleteMediaFromCloudinary, uploadMedia } from "../utils/cloudinary.js";

export const register = async (req, res) => {
  try {

    const { name, email, password } = req.body; // patel214
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      })
    };

    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "User already exist with this email."
      })
    };

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully."
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to register"
    });
  };
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required."
      })
    };

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Incorrect email or password"
      })
    };

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect email or password"
      });
    };

    generateToken(res, user, `Welcome back ${user.name}`);

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to login"
    })
  }
};

export const logout = async (_, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logged out successfully.",
      success: true
    })
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to logout"
    })
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.id;
    const user = await User.findById(userId).select("-password").populate("enrolledCourses");
    if (!user) {
      return res.status(404).json({
        message: "Profile not found",
        success: false
      })
    };

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load user"
    })
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.id;
    const { name } = req.body;
    const profilePhoto = req.file;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        success: false
      });
    };

    // Agar name update nahi kiya gaya hai, toh purani name rakhni hai
    const updatedName = name || user.name; // Agar name undefined ya empty hai, toh purani name lo

    // Agar profile photo update nahi kiya gaya hai, toh purani photo URL rakhni hai
    let updatedPhotoUrl = user.photoUrl; // Purani photo ka URL by default rakhna hai
    if (profilePhoto) {
      // Agar nayi profile photo hai, toh usay Cloudinary par upload karenge
      if (user.photoUrl) {
        const publicId = user.photoUrl.split("/").pop().split(".")[0]; // Extract public ID from old photo URL
        deleteMediaFromCloudinary(publicId); // Purani photo ko delete karna
      };

      // Nayi photo ko upload karna
      const cloudResponse = await uploadMedia(profilePhoto.path);
      updatedPhotoUrl = cloudResponse.secure_url; // Nayi photo ka URL
    };

    // Updated data ko set karna
    const updatedData = { name: updatedName, photoUrl: updatedPhotoUrl };

    // User ko update karna
    const updatedUser = await User.findByIdAndUpdate(userId, updatedData, { new: true }).select("-password");

    return res.status(200).json({
      success: true,
      user: updatedUser,
      message: "Profile updated successfully."
    });

  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile"
    });
  }
};
