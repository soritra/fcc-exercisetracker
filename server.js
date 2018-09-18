require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.Promise = require('bluebird')
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/exercisetracker', {
  useMongoClient: true
})

var port = process.env.PORT || 3000

app.use(cors({ optionSuccessStatus: 200 }))

var urlencodedParser = bodyParser.urlencoded({ extended: false })
app.use(urlencodedParser)
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

var exerciseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  date: Date
},{ usePushEach: true })

var userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  exercises: [exerciseSchema]
},{ usePushEach: true })

var User = mongoose.model('User', userSchema)

// Not found middleware
/*app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})*/

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

// api
app.post('/api/exercise/new-user', function (req, res, next) {
  var username = req.body.username
  if (!username) {
    return res.json({
      msg: 'Username required'
    })
  }

  const data = {
    username: username
  }
  var newUser = new User(data)
  newUser.save()
    .then(item => {
      //res.send("user added successfully");
      res.json({
        _id: item._id,
        username: item.username
      })
    })
    .catch(err => {
      res.status(400).send("user could not be added");
    });
})

app.post('/api/exercise/add', function (req, res, next) {
  var uid = req.body.userId
  if (!uid) {
    return res.json({
      msg: 'User id required'
    })
  }

  var duration = req.body.duration
  if (!duration) {
    return res.json({
      msg: 'Duration required'
    })
  }

  const data = {
    description: req.body.description,
    duration: duration,
    date: req.body.date
  }
  /*User.update(
    { _id: uid },
    { $push: { exercises: data }},
    function (err, success) { console.log(arguments)
      if (err) {
        res.sendStatus(500).send('database error').end()
      } else {
        res.json({
          _id: uid,
          //username: usrdoc.username,
          description: data.description,
          duration: data.duration,
          date: data.date
        }).end()
      }
    }
  )*/
  User.findOne({ _id: uid }, function(err, usrdoc) {
    if (err) {
      res.sendStatus(500).send('database error').end()
    }

    if (!usrdoc) {
      res.sendStatus(404).send('user was not found').end() 
    } else {
      usrdoc.exercises.push(data)
      usrdoc.markModified('exercises') 
      usrdoc.save()
      //res.sendStatus(200).send('log saved').end()
      res.json({
        _id: usrdoc._id,
        username: usrdoc.username,
        description: data.description,
        duration: data.duration,
        date: data.date
      }).end()
    } 
  })
})

const getHandler = function (req, res, next) {
  const query = req.query;
  if (!query.userId) {
    res.json({
      msg: 'user not found'
    })
  } else {
    res.json({
      msg: 'hoho'
    })
  }
  
}
app.route('/api/exercise/log').get(getHandler).post(getHandler);

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
