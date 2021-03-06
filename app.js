require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb+srv://admin-abhi:abhijain@cluster0.5qosq.mongodb.net/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    twitterId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// used to serialize the user for the session
passport.serializeUser(function (user, done) {
    done(null, user.id);
    // where is this user.id going? Are we supposed to access this anywhere?
});

// used to deserialize the user
passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

passport.use(new TwitterStrategy({
    consumerKey: process.env.API_KEY,
    consumerSecret: process.env.API_SECRET_KEY,
    callbackURL: "http://127.0.0.1:3000/auth/twitter/secrets"
},
    function (token, tokenSecret, profile, cb) {
        User.findOrCreate({ twitterId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get("/", function (req, res) {
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get('/auth/twitter',
    passport.authenticate('twitter'));

app.get('/auth/twitter/secrets',
    passport.authenticate('twitter', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/secrets", function (req, res) {
    User.find({ "secret": { $ne: null } }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                res.render("secrets", { userWithSecrets: foundUser })
            }
        }
    })
});

app.get("/logout", function (req, res) {
    req.logOut();
    res.redirect("/");
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save(function () {
                    res.redirect("/secrets")
                })
            }
        }
    })
})

app.post("/register", function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    })
});

app.post("/login", function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            })
        }
    })
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function () {
    console.log("Successfully run at port 3000.")
});























// SECRET=Thisisourlittilesecret.
// CLIENT_ID=517436648632-ic5395u1fabe6grhqtp5ghmnnt39a0qp.apps.googleusercontent.com
// CLIENT_SECRET=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

// API_KEY=1YzZaRbR8ZqOgRIgFDpqA8jK4
// API_SECRET_KEY=wpFKnoJx6IrILmRAQdvQeTbd9LT1Z7EqzN4IbSQdyiZ3fM5KWR


// TWITTER_CONSUMER_KEY=VG5zTzd5RFpPeTA1MElWeTRpY2U6MTpjaQ
// TWITTER_CONSUMER_SECRET=DiJP45DZx9k0yAQu9e9agxHGrr9hJMvVPJDIVoS49ol7Ou8jWq
// BEARER_TOKEN=AAAAAAAAAAAAAAAAAAAAAGYmZQEAAAAAqTgaz8%2FqL0lja8PUBwySYxwzHHI%3DaOeiyfuufST9ETFyMkNz7Kv9sBoBMNGqsnQCVxsVyooZCyJhcE
