require('dotenv').config();
const express = require('express');
const http = require("http");
const {Server} = require("socket.io");
const connectDB = require("./config/db.js");
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
    	origin: [
			"http://localhost:5173",
			"https://disaster-management-platform-seven.vercel.app"
    	],
    	methods: ['GET', 'POST'],
 	},
});

connectDB();

const User = require("./models/user.js");
const sosReport = require("./models/report.js");

app.use(express.json());
app.use(helmet());
app.use(morgan('dev'));

app.use(cors({
	origin: [
		"http://localhost:5173",
		"https://disaster-management-platform-seven.vercel.app"
	],
    credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/authroutes.js'));
app.use('/api/dashboard', require('./routes/dashboardroutes.js'));
app.use('/api/sos', require('./routes/sosroutes.js'));
app.use('/api/rescue-teams', require('./routes/rescueroutes.js'));
app.use('/api/shelters', require('./routes/shelterroutes.js'));
app.use('/api/risk-zones', require('./routes/riskzoneroutes.js'));
app.use('/api/resources', require('./routes/resourceroutes'));
app.use('/api/resource-requests', require('./routes/resourcerequestroutes'));
app.use('/api/volunteers', require('./routes/volunteerroutes'));
app.use('/api/campaigns', require('./routes/campaignroutes'));
app.use('/api/habitations', require('./routes/habitationRoutes.js'));


 

app.set('io', io);

io.on('connection', (socket) => {
	console.log('Client connected:', socket.id);
  	socket.on('disconnect', () => {
    	console.log('Client disconnected:', socket.id);
  	});
});


const PORT = process.env.PORT;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
