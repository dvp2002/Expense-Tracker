const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
const Cookies = require("js-cookie");
const lunchToken = "526dece47e719c2bf0b5e4713b81f829e5231d0b73edf90221";

//middleware

app.use(express.static("public"));
const cookieParser = require("cookie-parser");
app.use(express.urlencoded({ extended: false }))
app.use(express.json());
app.use(cookieParser());

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = '656347660357-ii242safgbntfafh1qnrrj3djg11pn9q.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);


//database connection

require("./db/conn");

//database collections

const Register = require("./models/userregistration");
const gRegister = require("./models/guserregistration");
const recRegister = require("./models/records");
const { ObjectId } = require("mongodb");

//ports and views

const port = process.env.PORT || 7000;
app.set("view engine", "ejs");


app.get('/', (req, res) => {

    res.render("home.ejs");
});

app.get('/register', (req, res) => {
    res.render("register.ejs", { danger: '' });
});

app.post('/register', async (req, res) => {
    try {
        const password = req.body.password;
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const email = req.body.email;
        const user = req.body.name;
        let useremail = await Register.findOne({ email: email });
        if (useremail) {
            res.render("login.ejs", { danger: 'User is already Registered, now Please Login' });
        }
        else {
            if ((user.length >= 5) && (/[a-zA-Z]/i.test(user))) {
                if (email.includes("@gmail.com") == true) {
                    if ((password.length >= 8) && (password.includes("@") || password.includes("!") || password.includes("~")) && (/[a-zA-Z]/i.test(password))) {
                        const registerUser = new Register({
                            name: req.body.name,
                            email: req.body.email,
                            password: req.body.password,
                            hashedpwd: hashedPassword,
                            balance: 0
                        })
                        const registered = await registerUser.save();
                        res.redirect('/');
                    }
                    else {
                        res.render("register.ejs", { danger: 'Invalid Password, Please enter a valid password' });
                    }
                }
                else {
                    res.render("register.ejs", { danger: 'Invalid Email, Please enter a valid email' });
                }
            }
            else {
                res.render("register.ejs", { danger: 'Please enter a valid Username' });
            }
        }
    }
    catch (e) {
        res.status(404).send(e);
    }
});

app.get('/login', (req, res) => {
    res.render("login.ejs", { danger: '' });
});

app.post('/login', async (req, res) => {
    try {
        if (!Cookies.get('login-token')) {
            const password = req.body.password;
            const email = req.body.email;
            let useremail = await Register.findOne({ email: email });
            if (useremail) {
                if (useremail.password === password) {
                    res.clearCookie('verify-token');
                    res.cookie("login-token");
                    res.cookie('verify-token', useremail.hashedpwd);
                    res.clearCookie("session-token");
                    res.redirect("/");
                }
                else {
                    res.render("login.ejs", { danger: 'Invalid Credentials for login, please try again.' });
                }
            }
            else {
                res.render("login.ejs", { danger: 'User has not been found, please try again.' });
            }
        }
        else {
            res.redirect("/");
        }
    } catch (e) {
        res.status(400).send(e);
    }
});
app.get('/google', (req, res) => {
    console.log("google connected");
})

app.post('/google', (req, res) => {
    let token = req.body.token;

    async function verify() {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: CLIENT_ID
        });
        const payload = ticket.getPayload();
        try {
            const em = payload['email'];
            const userem = await gRegister.findOne({ email: em });
            if (userem) {
                res.clearCookie('verify-token');
                res.cookie('verify-token', userem.hashedpwd);
                res.clearCookie('login-token');
                console.log('user is already registered through google');
            }
            else {
                var ObjectId = require('mongodb').ObjectId;
                const registerUser = new gRegister({
                    name: payload['name'],
                    email: em,
                    hashedpwd: payload['at_hash'],
                    balance: 0
                });
                res.cookie('verify-token', payload['at_hash']);
                res.clearCookie('login-token');
                const registered = await registerUser.save();
            }
        }
        catch (e) {
            console.log(e);
        }
    }
    verify().then(() => {
        res.cookie('session-token', token);
        res.send('success');
    }).
        catch(console.error);
});

app.get('/tracker', async (req, res) => {
    const lt = req.cookies['login-token'];
    const gt = req.cookies['session-token'];
    const vt = req.cookies['verify-token'];
    if (!lt) {
        if (!gt)
            res.render("login.ejs", { danger: 'Please Login First' });
        else {
            const userem = await gRegister.findOne({ hashedpwd: vt });
            var records = await recRegister.find({ hashedpwd: vt });
            res.render("tracker", { user: userem.name, danger: '', records })
        }
    }
    else {
        const userem = await Register.findOne({ hashedpwd: vt });
        var records = await recRegister.find({ hashedpwd: vt });
        res.render("tracker", { user: userem.name, danger: '', records });
    }
});

app.post('/tracker', async (req, res) => {
    const vt = req.cookies['verify-token'];
    const userem = await recRegister.findOne({ hashedpwd: vt });
});

app.get('/summary', async (req, res) => {
    const lt = req.cookies['login-token'];
    const gt = req.cookies['session-token'];
    const vt = req.cookies['verify-token'];
    if (!lt) {
        if (!gt)
            res.render("login.ejs", { danger: 'Please Login First' });
        else {
            const userem = await gRegister.findOne({ hashedpwd: vt });
            var records = await recRegister.find({ hashedpwd: vt });
            var update = 0;
            var positive = 0, negative = 0;
            if (records.length > 0) {
                records.forEach(att => {
                    if(att.amount >= 0)
                    positive += att.amount;
                    else
                    negative += att.amount;
                    update += att.amount;
                });
            }
            update = parseFloat(update).toPrecision(9);
            positive = parseFloat(positive).toPrecision(9);
            negative = parseFloat(negative).toPrecision(9);
            let doc = await gRegister.findOneAndUpdate({ balance: update });
            res.render("summary", { bal: update, pos: positive, neg: negative });
        }
    }
    else {
        const userem = await Register.findOne({ hashedpwd: vt });
        var records = await recRegister.find({ hashedpwd: vt });
            var update = 0;
            var positive = 0, negative = 0;
            if (records.length > 0) {
                records.forEach(att => {
                    if(att.amount >= 0)
                    positive += att.amount;
                    else
                    negative += att.amount;
                    update += att.amount;
                });
            }
            update = parseFloat(update).toPrecision(9);
            positive = parseFloat(positive).toPrecision(9);
            negative = parseFloat(negative).toPrecision(9);
            let doc = await Register.findOneAndUpdate({ balance: update });
        res.render("summary", { bal: update, pos: positive, neg: negative });
    }
});

app.get('/addexp', (req, res) => {
    res.render("expense", { danger: '' });
})

app.post('/addexp', async (req, res) => {
    const vt = req.cookies['verify-token'];
    const expamt = req.body.amt;
    const cat = req.body.category;
    const desc = req.body.desc;
    if (isNaN(expamt)) {
        res.render("expense", { danger: "Please Enter a valid amount" });
    }
    else {
        const recUser = new recRegister({
            hashedpwd: vt,
            category: cat,
            description: desc,
            amount: expamt,
            id: ""
        });
        recUser.id = ObjectId(recUser._id).toString();
        const registered = await recUser.save();
        res.render("expense", { danger: "Expense Record added" });
    }
});

app.get('/remexp', (req,res) => {
    res.render("remexpense", { danger: "" });
})

app.post('/remexp', async(req,res) => {
    try{
        var tranId = req.body.idtrans;
        var transUser = await recRegister.findOne({ id: tranId });
        if(transUser){
            const del = await recRegister.deleteOne({ id: tranId });
            res.render("remexpense",{ danger: "Transaction Deleted Successfully!" });
        }
        else
        {
            res.render("remexpense",{ danger: "Transaction Record not found, please enter again" });
        }
    } catch(e){
        res.status(400).send(e);
    }
    
})

app.get('/logout', (req, res) => {
    res.clearCookie('session-token');
    res.clearCookie('login-token');
    res.clearCookie('verify-token');
    res.render('home');
})

app.listen(port, () => {
    console.log(`listening on port ${port}`);
});
