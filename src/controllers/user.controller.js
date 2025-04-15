import { asyncHandler } from "../utils/asynchandler.js";
import mongoose, { isValidObjectId } from "mongoose";

import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);

    const refreshToken = user.generateRefreshToken();
    const accesToken = user.generateAccessToken();

    if (!user) {
      console.log("user is not found generateacesstoken");
    }
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accesToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went Wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password, phone, fullName } = req.body;
  console.log("email : ", email);
  if (
    [email, phone, username, password, fullName].some(
      (field) => field.trim() === ""
    )
  ) {
    throw new ApiError(400, "All fields  are required");
  }
  if (email.includes("@")) {
    console.log("Valid: Email contains @");
  } else {
    console.log("Invalid: Email does not contain @");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with this email is already exits");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path; // this will give the local path of the file in which it is saved inits local path before uploading it into cloudinary
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    username: username.toLowerCase(),
    fullName,
    phone,
    avatar: avatar.url,
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if (!(email || username)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], // with $or MONGODB OPERATOR it can find any one of them
  });

  if (!user) {
    throw new ApiError(404, "User does not exit");
  }

  const isPasswordvalid = await user.isPasswordCorrect(password); // this is the method call from user model

  if (!isPasswordvalid) {
    throw new ApiError(401, "Invalid user Credentials");
  }

  const { accesToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true, // the response will be only editable from the servre side only
    secure: true,
  };
  return res
    .status(200)
    .cookie("accessToken", accesToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accesToken,
          refreshToken,
        },

        "User logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // as there is no id how to loggout? so there is a middleware "auth.middleware"
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: 1 },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized Request!");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid old password");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changes successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are mandatory");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        fullName, // fullName:fullName
        email, // email: email
      },
    },
    { new: true } // Ensures the function returns the updated user document instead of the old one.
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Accout details has been updated."));
});

const updateUserName = asyncHandler(async (req, res) => {
  const { username } = req.body;
  console.log("The username is ", username);

  if (!username) {
    throw new ApiError(400, "Username field is mandatory");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        username,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Username has been updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  // console.log("Avatar url", req.files.path);

  if (!avatarLocalPath) {
    throw new ApiError(400, "Error while uploading the avatar");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar image has been updated"));
});

const deleteUser = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user._id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  changeCurrentPassword,
  updateAccountDetails,
  updateUserAvatar,
  updateUserName,
  refreshAccessToken,
  getCurrentUser,
  deleteUser,
};
