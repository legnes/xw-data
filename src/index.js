const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { graphqlHTTP } = require('express-graphql');
const { GraphQLObjectType, GraphQLString, GraphQLInt, GraphQLList, GraphQLSchema } = require('graphql');
const joinMonster = require('join-monster')

const { db } = require('../config');

// const routes = require('./routes');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());







const Clue = new GraphQLObjectType({
  name: 'Clue',
  extensions: {
    joinMonster: {
      sqlTable: 'clues',
      uniqueKey: 'id'
    }
  },
  fields: () => ({
    id: { type: GraphQLString },
    text: { type: GraphQLString },
    answer: { type: GraphQLString },
    direction: { type: GraphQLString },
    grid_index: { type: GraphQLInt },
    grid_number: { type: GraphQLInt },
    puzzle_id: { type: GraphQLString },
    puzzle: {
      type: Puzzle,
      extensions: {
        joinMonster: {
          sqlJoin: (clueTable, puzzleTable, args) => `${clueTable}.puzzle_id = ${puzzleTable}.id`
        }
      }
    }
  })
});

const Puzzle = new GraphQLObjectType({
  name: 'Puzzle',
  extensions: {
    joinMonster: {
      sqlTable: 'puzzles',
      uniqueKey: 'id',
    }
  },
  fields: () => ({
    id: { type: GraphQLString },
    version: { type: GraphQLString },
    width: { type: GraphQLInt },
    height: { type: GraphQLInt },
    num_clues: { type: GraphQLInt },
    solution: { type: GraphQLString },
    title: { type: GraphQLString },
    author: { type: GraphQLString },
    copyright: { type: GraphQLString },
    notes: { type: GraphQLString },
    date: { type: GraphQLString },
    nyt_id: { type: GraphQLString },
    clues: {
      type: GraphQLList(Clue),
      extensions: {
        joinMonster: {
          sqlJoin: (puzzleTable, clueTable, args) => `${clueTable}.puzzle_id = ${puzzleTable}.id`
        }
      }
    }
  })
});

const QueryRoot = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    clues: {
      type: new GraphQLList(Clue),
      args: {
        answer: { type: GraphQLString }
      },
      where: (cluesTable, args, context) => {
        if (args.answer) return `${cluesTable}.answer = ${args.answer}`;
      },
      resolve: (parent, args, context, resolveInfo) => joinMonster.default(resolveInfo, {}, (sql) => db.query(sql))
    },
    puzzles: {
      type: new GraphQLList(Puzzle),
      resolve: (parent, args, context, resolveInfo) => joinMonster.default(resolveInfo, {}, (sql) => db.query(sql))
    },
  })
});

const schema = new GraphQLSchema({ query: QueryRoot });

app.use('/api', graphqlHTTP({
  schema,
  graphiql: true
}));






// routes(app);

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server listening`)
});