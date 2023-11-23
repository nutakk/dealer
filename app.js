const express = require('express');
const mysql = require("mysql")
const path = require("path")
const dotenv = require('dotenv')
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const sessions = require('express-session');
const cookieParser = require("cookie-parser");

dotenv.config({ path: './.env'})

const app = express();

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})

const publicDir = path.join(__dirname, './public')

app.use(express.static(publicDir))
app.use(express.urlencoded({extended: 'false'}))
app.use(cookieParser());
app.use(express.json())


const oneDay = 1000 * 60 * 60 * 24;
app.use(sessions({
    secret: "secrctekey",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}));

var session;

app.set('view engine', 'hbs')

db.connect((error) => {
    if(error) {
        console.log(error)
    } else {
        console.log("MySQL connected!")
    }
})

const ifNotLoggedIn=(req,res,next)=>{
    if(!req.session.isLoggedIn){
        return res.render('login');
    }
    next();
}

app.get("/register", (req, res) => {
    res.render("register")
})
app.get("/login", (req, res) => {
    res.render("login")
})
app.get("/job", (req, res) => {
    session = req.session;
    res.render("job")
})


app.post("/auth/register", (req, res) => {
    const { username, email,tel, password, password_confirm} = req.body
    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, result) => {
        if(error){
            console.log(error)
        }

        if( result.length > 0 ) {
            return res.render('register', {
                message: 'This email is already in use'
            })
        } else if(password !== password_confirm) {
            return res.render('register', {
                message: 'This email is already in use'
            })
        }

        let hashedPassword = await bcrypt.hash(password, 8)

        console.log(hashedPassword)
       
        db.query('INSERT INTO users SET?', {username: username, email: email,tel:tel, password: hashedPassword}, (err, result) => {
            if(error) {
                console.log(error)
            } else {
                return res.render('login', {
                    message: 'User registered!'
                })
            }
        })        
    })
})
app.post("/auth/login", (req, res) => {    
    const { username, password} = req.body

    db.query('SELECT username,password FROM users WHERE username = ?', [username,password], async (error, result) => {
        if(error){
            console.log(error)
        }
        const data=JSON.parse(JSON.stringify(result))
        console.log(password)
            bcrypt.compare(password, data[0].password, function(err, result) {
            if (password.length == 0) {
                return res.render('login', {
                message: 'Please key any fill!'
                })
            } else if(result == true) {
                session = req.session;
                session.userid=username;
                console.log(req.session)

                res.redirect('/index');
            }else{return res.render('login', {
                message: 'Password incorrect!'
            })
            }
          });
    })
})


app.post("/job/add", (req, res) => {    
    const { title, price,desc,cate} = req.body
    db.query('SELECT title FROM job WHERE title = ?', [title], async (error, result) => {
        if(error){
            console.log(error)
        }
        session = req.session;
        
        db.query('INSERT INTO job SET?', {title: title, price: price,desc:desc,cate:cate,ses:req.session.userid}, (err, result) => {
            if(error) {
                console.log(error)
            } else {
                return res.render('index', {
                })
            }
        })        
    })
})


app.post("/authen", (req, res) => {    
    const { name, surname,idcard,lasercard} = req.body
    db.query('SELECT name FROM authen WHERE name = ?', [name], async (error, result) => {
        if(error){
            console.log(error)
        }
       
        db.query('INSERT INTO authen SET?', {name: name, surname: surname,idcard:idcard,lasercard:lasercard}, (err, result) => {
            if(error) {
                console.log(error)
            } else {

            }
        })        
    })
})

app.get("/request/:id", (req, res) => {
    const id = req.params.id;
    session = req.session;
    return res.render('request', {
        data:id
    })
})
app.post("/request/add", (req, res) => {
    const {title,address,starttime,startdate,endtime,enddate,desc,job_id} = req.body
    console.log(job_id)
    session = req.session;
    db.query('SELECT title FROM request WHERE title = ?', [title], async (error, result) => {
        if(error){
            console.log(error)
        }
        db.query('INSERT INTO request SET?', {title: title,job_id:job_id,address:address,starttime:starttime,startdate:startdate,endtime:endtime,enddate:enddate,desc:desc,ses:req.session.userid}, (err, result) => {
            if(error) {
                console.log(error)
            } else {
                /*
                return res.render('job', {
                    message: 'User registered!'
                })
                */
            }
        })        
    })
})

app.get("/noti", (req, res) => {
    session = req.session;
    db.query('select job.title, job.price,job.job_id,request.id,request.ses,request.address,request.starttime,request.startdate,request.endtime,request.enddate,request.desc from request join job on request.job_id = job.job_id and job.ses = '+'"'+req.session.userid+'"', function (error, results) {
        if (error) throw error;
        const myArray  = JSON.parse(JSON.stringify(results));
        console.log(myArray)
        return res.render('noti', {
            data: myArray
        })
    })
})

app.get("/index", (req, res) => {
    db.query('SELECT * FROM job ', function (error, results) {
        if (error) throw error;
        const myArray  = JSON.parse(JSON.stringify(results));
        session = req.session;
        return res.render('index', {
            data: myArray
        })
    })
})

app.get("/index/:list", (req, res) => {
    const listId = req.params.list;
    session = req.session;
    console.log(listId)
    db.query('SELECT * FROM job WHERE cate = '+'"'+listId+'"', function (error, results) {
        if (error) throw error;
        const myArray  = JSON.parse(JSON.stringify(results));
        return res.render('index', {
            data: myArray,
            list: listId
        })
    })
})

app.get('/detail/:id', function(req, res) {
    const jobId = req.params.id;
    session = req.session;
    db.query('SELECT job.title,job.job_id,job.price,job.desc,job.cate, comment.comment, comment.rating FROM job LEFT JOIN comment ON comment.job_id=job.job_id WHERE job.job_id = '+jobId, function (error, results) {
        if (error) throw error;
            const myArray  = JSON.parse(JSON.stringify(results));
            const comment  = JSON.parse(JSON.stringify(results));
            myArray.splice(1, myArray.length);
                return res.render('detail', {
                    data:myArray,
                    comment:comment
                })
    })
});

app.post('/comment', (req, res) => {
    const sql = 'INSERT INTO comment (rating, comment, job_id) VALUES (?, ?, ?)';
    const values = [req.body.rating, req.body.comment, req.body.job_id];
    db.query(sql, values, (err, result) => {
      if (err) throw err;
    });
});

app.get("/pay/:job_id/:req_id", (req, res) => {
    const job_id = [req.params.job_id];
    const req_id = [req.params.req_id];
    session = req.session

    return res.render('pay', {
        data1:job_id,
        data2:req_id
    })
})
app.post("/pay/add", (req, res) => {
    const sql = 'INSERT INTO pay (job_id,req_id,date, time, last,price) VALUES (?, ?, ?, ?, ?, ?)';
    const values = [req.body.job_id,req.body.req_id,req.body.date, req.body.time, req.body.last, req.body.price];
    session = req.session;
    db.query(sql, values, (err, result) => {
        if (err) throw err;
      });

})

app.listen(5000, ()=> {
    console.log("server started on port 5000")
})

