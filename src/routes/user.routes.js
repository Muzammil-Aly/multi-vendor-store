import { Router } from "express";
import {
  registerUser,
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  updateAccountDetails,
  updateUserAvatar,
  updateUserName,
  deleteUser,
} from "../controllers/user.controller.js";

import { verifyJwt } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
const router = Router();

// router.route("/register").post(registerUser);

router
  .route("/register")
  .post(upload.fields([{ name: "avatar", maxCount: 1 }]), registerUser);

router.route("/login").post(loginUser);

// secure routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/delete").delete(verifyJwt, deleteUser);

router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJwt, changeCurrentPassword);
router.route("/current-user").post(verifyJwt, getCurrentUser);
router.route("/update-account").patch(verifyJwt, updateAccountDetails);
router.route("/update-username").patch(verifyJwt, updateUserName);
router
  .route("/avatar")
  .patch(verifyJwt, upload.single("avatar"), updateUserAvatar);
export default router;
