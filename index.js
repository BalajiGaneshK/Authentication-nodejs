const mongodb = require("mongodb");
const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");
const app = express();


require("dotenv").config();

const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID;
const port = process.env.PORT || 4001;
const dbUrl = process.env.DB_URL;

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.AUTH_FROM_MAIL,
    pass: process.env.AUTH_FROM_PASS
  }
});
//hello
app.use(express.json());
app.use(cors());

app.get("/", async (req, res) => {
    
    try {

    let client = await mongoClient.connect(dbUrl);
    let db = client.db("auth");
        let data = await db.collection("users").find().project({password:0}).toArray();
        
        res.status(200).json({ "allUsersData": data });
        

        

    client.close();
        
    }
    catch (error) {
      
        console.log(error);
        
    }
    
})

app.post("/register", async (req, res) => {
    try {

    let client = await mongoClient.connect(dbUrl);
        let db = client.db("auth");
        
        //1. Check if the data entered by user already exists in the database
        let found = await db.collection("users").findOne({ email: req.body.email });
        if (found !== null)
            res.status(409).json({ "regError": "User Already exists" });
        
        else {
            
            //db.collection("users").insertOne(req.body);

            //1.Before inserting the document in the db,the password has to be hashed
            let salt = await bcrypt.genSalt(10);

            /*NOTE:salt is something like a key,which changes the form of the input password,using algorithm.
            the 10, is the number of rounds,the algo is run.More rounds, more time taken */

            let hashedPassword = await bcrypt.hash(req.body.password, salt);
            console.log("Hashed password:", hashedPassword);
            
            req.body.password = hashedPassword;
            await db.collection("users").insertOne(req.body);
            let addedUser = await db.collection("users").findOne({ name: req.body.name });

            var mailOptions = {
            from: process.env.AUTH_FROM_MAIL,
            to: addedUser.email,
            subject: 'Registration email',
            text: 'Hello '+addedUser.name+' !'+'\n\n'+" Welcome to our community! Your registration was successful"+'\n\n'+'Love'+'\n'+'No More Maya'
            };

            transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
            });
            res.status(200).json({ "regUserDetails": addedUser });
            

        }
        
        
    }
    catch (error) {

        console.log(error);
    }
   

})

app.post("/login", async (req, res) => {
    try {

    let client = await mongoClient.connect(dbUrl);
        let db = client.db("auth");
        
        //1. Check if the data entered by user already exists in the database
        let userFound = await db.collection("users").findOne({ email: req.body.email });
        if (userFound === null)
            res.status(409).json({ "Error": "User Doesn't exist" });
        
        else {
            
            let isPasswordCorrect = await bcrypt.compare(req.body.password, userFound.password);
            if (isPasswordCorrect)
            {
                var mailOptions = {
            from: process.env.AUTH_FROM_MAIL,
            to: userFound.email,
            subject: 'Login attempt successful',
                    text: 'Hi ' + userFound.name + ','+'\n' + 'Login successful! Glad to have you back' + '\n\n' + 'Warm Regards,' + '\n' + 'No More Maya'
            };

            transporter.sendMail(mailOptions, function(error, info){
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
            }
            });
                res.status(200).json({ "userData": userFound });
            }
            else
                res.status(400).json({ "loginError": "Password incorrect" });
            

        }
        
        
    }
    catch (error) {

        console.log(error);
    }
})

app.listen(port, () => { console.log("App runs at ", port) });

