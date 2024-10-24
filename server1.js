const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const port = 4000;

const app = express();
app.use(express.static(__dirname)); 
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

// MongoDB connection for user data (using database 'list')
mongoose.connect('mongodb://127.0.0.1:27017/list', { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.once('open', () => {
    console.log("MongoDB connection to 'list' database successful");
});

// User schema and model
const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    role: String
});
const Users = mongoose.model("clients", userSchema);

// Establish a second connection for the 'projects' database
const projectDbConnection = mongoose.createConnection('mongodb://127.0.0.1:27017/projects', { useNewUrlParser: true, useUnifiedTopology: true });

projectDbConnection.once('open', () => {
    console.log("MongoDB connection to 'projects' database successful");
});

// Project schema and model for client project data
const projectSchema = new mongoose.Schema({
    name: String,
    project_name: String,
    project_description: String,
    amount: Number,
    email: String,
    phone: Number
});
const Project = projectDbConnection.model("all", projectSchema);

// Serve the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html')); 
});

// Serve the registration form
app.get('/register.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html')); 
});

// Handle form submission and redirect based on role
app.post('/post', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const user = new Users({
            name,
            email,
            password,
            role
        });
        
        await user.save(); 

        if (role.toLowerCase() === 'client') {
            res.redirect('/client.html');  
        } else if (role.toLowerCase() === 'freelancer') {
            res.redirect('/freelancer.html');  
        } else {
            res.status(400).send("Invalid role! Please choose 'client' or 'freelancer'");
        }
    } catch (error) {
        console.error("Error registering user:", error);
        res.status(500).send("Error registering user");
    }
});

// Login route to authenticate users
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await Users.findOne({ email, password });

        if (user) {
            if (user.role.toLowerCase() === 'client') {
                res.redirect('/client.html');
            } else if (user.role.toLowerCase() === 'freelancer') {
                res.redirect('/freelancer.html');
            }
        } else {
            res.status(401).send("Invalid email or password");
        }
    } catch (error) {
        console.error("Error logging in:", error);
        res.status(500).send("Error logging in");
    }
});

// Serve the client project submission form
app.get('/client.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.html'));
});

// Handle client project form submission and store it in the 'projects' database
app.post('/submit-project', async (req, res) => {
    try {
        const { name, project_name, project_description, amount, email, phone } = req.body;

        const project = new Project({
            name,
            project_name,
            project_description,
            amount,
            email,
            phone
        });
        
        await project.save(); 

        console.log("Project details saved:", project);
        res.send("Project submitted successfully");
    } catch (error) {
        console.error("Error saving project details:", error);
        res.status(500).send("Error submitting project");
    }
});

// Route to fetch all projects from 'projects' database and send to freelancer.html
app.get('/get-projects', async (req, res) => {
    try {
        const projects = await Project.find();
        res.json(projects);
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).send("Error fetching projects");
    }
});

// Route to handle when a freelancer takes a project
app.post('/take-project', async (req, res) => {
    try {
        const { project_id } = req.body;

        // Find and delete the project from the database
        const deletedProject = await Project.findByIdAndDelete(project_id);

        if (deletedProject) {
            console.log(`Project with ID ${project_id} has been taken and removed from the database`);
            res.redirect(`/project-taken.html?project_id=${project_id}`);
        } else {
            res.status(404).send("Project not found");
        }
    } catch (error) {
        console.error("Error taking project:", error);
        res.status(500).send("Error taking project");
    }
});

// Serve the project taken confirmation page with CSS
app.get('/project-taken.html', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="taken.css">
            <title>Project Taken</title>
        </head>
        <body>
            <div class="container">
                <h1>Project Taken</h1>
                <p>The project has been successfully taken and removed from the list.</p>
                <a class="back-btn" href="/freelancer.html">Back to Projects</a>
            </div>
        </body>
        </html>
    `);
});

// Start the server
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
});
