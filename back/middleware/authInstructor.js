import jwt from "jsonwebtoken";

const authInstructor = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ success: false, message: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "instructor") {
      return res
        .status(403)
        .json({ success: false, message: "Access denied. Instructors only." });
    }

    req.instructor = decoded; // contains id, role
    next();
  } catch (error) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

export default authInstructor;
