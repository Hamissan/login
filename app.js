//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser= require("body-parser");
const ejs = require("ejs");
const mongoose= require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy= require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");




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
 password: String,
 googleId:String,
 secret: String

 });
 userSchema.plugin(passportLocalMongoose);
 userSchema.plugin(findOrCreate);
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username, name: user.name });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/Secret", 
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.get("/", function(req,res){
    res.render("home");
});

app.get("/auth/google",passport.authenticate("google",{scope:["profile"]}));

 // the above line of code is sufficient enough to bring a pop up to the user tosign in using google
 app.get("/auth/google/Secret", 
 passport.authenticate('google', { failureRedirect: '/login' }),
 function(req, res) {
   // Successful authentication, redirect home.
   res.redirect('/secrets');
 });

app.get("/login", function(req,res){
    res.render("login");
});

app.get("/register", function(req,res){
    res.render("register");
});
app.get("/secrets", function(req, res){
    User.find({"secret": {$ne: null}})
        .then(foundUsers => {
            if (foundUsers && foundUsers.length > 0) {
                res.render("secrets", { usersWithSecrets: foundUsers });
            } else {
                res.render("secrets", { usersWithSecrets: [] });
            }
        })
        .catch(err => {
            console.log(err);
            // Handle the error, you might want to send an error response or redirect
            res.status(500).send("Internal Server Error");
        });
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

app.get("/submit", function(req,res){
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("/login");
    }
});

app.post("/submit", function(req,res){
const submittedSecret = req.body.secret;
// find the current user in our database and save the secert into their file

User.findById(req.user.id)
    .then(foundUser => {
        if (foundUser) {
            foundUser.secret = submittedSecret;
            return foundUser.save();
        }
    })
    .then(() => {
        res.redirect("/secrets");
    })
    .catch(error => {
        console.log(error);
    });


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