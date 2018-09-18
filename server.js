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
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
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

var isValidId = function (id) {
  return mongoose.Types.ObjectId.isValid(id)
}

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

  var description = req.body.description
  if (!description) {
    return res.json({
      msg: 'Description required'
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
    duration: duration
  }

  var dt = req.body.date
  if (dt) {
    data.date = dt
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
  if (!isValidId(uid)) {
    return res.sendStatus(500).send('User id not valid').end()
  }

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
        date: data.date || Date.now
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
    const uid = query.userId
    if (!isValidId(uid)) {
      return res.json({
        msg: 'User id not valid'
      })
    }
    User.findOne({ _id: uid }, function(err, usrdoc) {
      if (err) {
        res.json({
          msg: 'database error'
        })
      }

      if (!usrdoc) {
        res.json({
          msg: 'user was not found'
        })
      } else {
        //res.json(usrdoc)
        var out = {
          _id: usrdoc._id,
          username: usrdoc.username,
          count: usrdoc.__v,
          log: []
        }
        usrdoc.exercises.forEach((row) => {
          out.log.push({
            description: row.description,
            duration: parseInt(row.duration),
            date: row.date ? row.date.toLocaleDateString("en-US", { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : ''
          })
        })
        res.json(out)
      }
    })
  }
  
}
app.route('/api/exercise/log').get(getHandler).post(getHandler);

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
