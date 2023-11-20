//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser= require("body-parser");
const ejs = require("ejs");
const mongoose= require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");



const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended:true
}));

app.use(session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized:false
}));

// initialise passsport

app.use(passport.initialize());
app.use(passport.session()); 

const mongoURL = 'mongodb://localhost:27017/MyMongo2DB';
const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

mongoose.connect(mongoURL,mongoOptions)
.then(() => {
    console.log('Connected to MongoDB');
})
.catch((error) => {
    console.log("Error connecting to MongoDB.", error.message);
});

// create schema

 const userSchema = new mongoose.Schema({
 email: String,
 password: String   
 });
 userSchema.plugin(passportLocalMongoose);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.get("/", function(req,res){
    res.render("home");
});

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});
app.get("/secrets", function(req,res){
    if(req.isAuthenticated()){
        res.render("secrets");
    }else{
        res.redirect("/login");
    }
    
});
// end user session
app.get("/logout", function(req,res){
req.logout(function(err){
    if(err){
        console.log(err);
    }
});
res.redirect("/");
});

app.post("/register", function(req, res){
User.register({username:req.body.username},req.body.password, function(err, user){
    if(err){
        console.log(err);
        res.redirect("/register");
    }else{
passport.authenticate("local")(req, res, function(){
   res.redirect("/secrets"); 
});
    }
});

});
app.post("/login", function(req, res){
    const user =new User({
       username:req.body.username,
       password:req.body.password 
    });
    req.login(user, function(err){
        if(err){
            console/log(err);
        }
        else{
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets");
            })
        }
    })
});

app.listen(3000, function(){
    console.log("Server is running on port 3000.");
});