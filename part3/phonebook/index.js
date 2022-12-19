require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const Person = require("./modules/person");

const http = express();

http.use(cors());
http.use(express.static("build"));
http.use(express.json());

// http.use(morgan("tiny"));
morgan.token("type", (req, res) => req.headers["authorization"]);
http.use(morgan(":type"));
http.use(
  morgan((tokens, req, res) => {
    const method = tokens.method(req, res);
    const logs = [
      method,
      tokens.url(req, res),
      tokens.status(req, res),
      tokens.res(req, res, "content-length"),
      "-",
      tokens["response-time"](req, res),
      "ms"
    ];
    if (method === "POST") {
      logs.push(JSON.stringify(req.body));
    }
    return logs.join(" ");
  })
);

let persons = [
  {
    id: 1,
    name: "Arto Hellas",
    number: "040-123456"
  },
  {
    id: 2,
    name: "Ada Lovelace",
    number: "39-44-5323523"
  },
  {
    id: 3,
    name: "Dan Abramov",
    number: "12-43-234345"
  },
  {
    id: 4,
    name: "Mary Poppendieck",
    number: "39-23-6423122"
  }
];

http.get("/api/persons", (request, response) => {
  Person.find({}).then((result) => {
    response.send(result);
  });
});

http.get("/info", (request, response) => {
  response.setHeader("Content-Type", "text/html");
  Person.count().then((count) => {
    response.send(`
  <p>Phonebook has info for ${count} people</p>
  <p>${new Date()}</P>
  `);
  });
});

http.get("/api/persons/:id", (request, response, next) => {
  const id = request.params.id;
  Person.findById(id)
    .then((person) => {
      console.log(person);
      if (person) {
        response.json(person);
      } else {
        response.status(404).end(`The person with id ${id} was not found`);
      }
    })
    .catch((err) => {
      next(err);
    });
});

http.delete("/api/persons/:id", (request, response, next) => {
  const id = request.params.id;
  Person.findByIdAndRemove(id)
    .then((res) => {
      response.status(204).end();
    })
    .catch((error) => {
      next(error);
    });
});

http.post("/api/persons", (request, response) => {
  const person = { ...request.body };

  if (!(person.name && person.number)) {
    response.statusMessage = "name or number missing";
    response.status(400).end();
    return;
  }

  // check repeat
  Person.find({ name: person.name }).then((res) => {
    if (res.length) {
      response.statusMessage = "name already exists";
      response.status(400).end();
      return;
    }

    const newPerson = new Person(person);
    newPerson.save().then((res) => {
      console.log(`added ${person.name} ${person.number} to phonebook`);
      response.send(person);
    });
  });
});

http.put("/api/persons/:id", (request, response) => {
  const person = { ...request.body };
  const id = request.params.id;

  if (!(person.name && person.number)) {
    response.statusMessage = "name or number missing";
    response.status(400).end();
    return;
  }

  Person.findByIdAndUpdate(id, person).then((res) => {
    console.log(`modify ${person.name} ${person.number} to phonebook`);
    response.send(person);
  });
});

// error handling
const errorHandler = (error, request, response, next) => {
  console.log(error.message);
  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  }
  next(error);
};
http.use(errorHandler); // 错误处理放在所有中间件的最后

const PORT = process.env.PORT;
http.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
