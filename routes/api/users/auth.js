const express = require("express");
const bcrypt = require("bcrypt");
const { User } = require("../../../models/user");
const { schemas } = require("../../../models/user");
const { HttpError, sendMail } = require("../../../helpers");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { SECRET_KEY, BASE_URL } = process.env;
const { authenticate, upload } = require("../../../middlewares");
const gravatar = require("gravatar");
const path = require("path");
const avatarsDir = path.join(__dirname, "../../../", "public", "avatars");
const fs = require("fs/promises");
const { resizeAndSaveAvatar } = require("../../../helpers/jimp");
const { nanoid } = require("nanoid");

router.post("/users/register", async (req, res, next) => {
  try {
    const { error } = schemas.registerAndLoginSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw HttpError(409, "Email is already in use");
    }
    const hashPassword = await bcrypt.hash(password, 10);
    const avatarURL = gravatar.url(email);
    const verificationCode = nanoid();
    const newUser = await User.create({
      ...req.body,
      password: hashPassword,
      avatarURL,
      verificationCode,
    });

    const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${verificationCode}">Verify email and all will be alright</a>`,
    };

    await sendMail(verifyEmail);

    res.status(201).json({
      email: newUser,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/verify/:verificationCode", async (req, res, next) => {
  try {
    const { verificationCode } = req.params;
    const user = await User.findOne({ verificationCode });

    if (!user) {
      throw HttpError(401, "Email not found");
    }
    await User.findByIdAndUpdate({
      verify: true,
      verificationCode: "",
    });

    res.json({
      message: "Email verify success",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/users/verify", async (req, res, next) => {
  try {
    const { error } = schemas.emailSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }
    const { email } = req.body;
    const user = User.findOne(email);
    if (!user) {
      throw HttpError(401, "Email not found");
    }

    if (user.verify) {
      throw HttpError(401, "Email already verify");
    }

    const verifyMail = {
      to: email,
      subject: "Verify mail",
      html: `<a target="_blank" href="${BASE_URL}/api/auth/users/verify/${user.verificationCode}">Verify email and all will be alright.</a>`,
    };

    await sendMail(verifyMail);

    res.json({
      message: "Verify email send success",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/users/login", async (req, res, next) => {
  try {
    const { error } = schemas.registerAndLoginSchema.validate(req.body);
    if (error) {
      throw HttpError(400, error.message);
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw HttpError(401, "Email or password invalid");
    }
    const passwordCompare = await bcrypt.compare(password, user.password);
    if (!passwordCompare) {
      throw HttpError(401, "Email or password invalid");
    }

    const payload = {
      id: user._id,
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
    await User.findByIdAndUpdate(user._id, { token });
    res.json({
      token,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/users/current", authenticate, async (req, res, next) => {
  try {
    const { email } = req.user;
    res.json({
      email,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/users/logout", authenticate, async (req, res, next) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { token: "" });

    res.json({
      message: "Logout success",
    });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/users/avatars",
  authenticate,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const { _id } = req.user;
      const { path: tempUpload, originalname } = req.file;
      const filename = `${_id}_${originalname}`;
      const resultUpload = path.join(avatarsDir, filename);
      await resizeAndSaveAvatar(tempUpload, resultUpload);
      await fs.rename(tempUpload, resultUpload);
      const avatarURL = path.join("avatars", filename);

      await User.findByIdAndUpdate(_id, { avatarURL });

      res.json({
        avatarURL,
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
