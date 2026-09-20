require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db.js");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
    "https://disaster-management-platform-seven.vercel.app"
].filter(Boolean);


const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

connectDB();

app.use(express.json());
app.use(helmet());
app.use(morgan("dev"));
app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Backend API is running",
        database: "connected",
        mlService: "separate service"
    });
});

app.use("/api/auth", require("./routes/authroutes.js"));
app.use("/api/habitations", require("./routes/habitationroutes.js"));
app.use("/api/relocation", require("./routes/relocationroutes.js"));
app.use("/api/dashboard", require("./routes/dashboardroutes.js"));
app.use("/api/sos", require("./routes/sosroutes.js"));
app.use("/api/risk-zones", require("./routes/riskzoneroutes.js"));
app.use("/api/resources", require("./routes/resourceroutes.js"));
app.use("/api/resource-requests", require("./routes/resourcerequestroutes"));

app.set("io", io);

io.on("connection", (socket) => {

    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
		console.log("Client disconnected:", socket.id);
	});

});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {

    console.log(`Server running on port ${PORT}`);

    console.log("Allowed origins:", allowedOrigins);

});