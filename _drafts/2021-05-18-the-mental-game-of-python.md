# The Mental Game of Python
Note: This post is summery of talk given by Raymond Hettinger at PyBay 2019. https://www.youtube.com/watch?v=Uwuv05aZ6ug

With 150k points of SO and teaching student, he study of what goes wrong, what causes to people toget stuck and what make them successful. 

Here are list of stratagies:

- Chunking and Aliasing
  E.g. Random module

- Solve a related but simpler problem
- Incremental development
  E.g. Tree walker

- Build classes independently and let inheritance discover itself. 
  e.g. Validators

- Repeat tasks manually until patterns emerge, then move to a function. continue to generalise if needed.
  e.g. convert csv to xml


- Consider OOP as a graph traversal problem
  e.g. kaprekar function

- Seperate ETL from analysis. Separate analysis from presentation.


- Verify type, verify size, view subset of data, and test a subset
- Humans should never gaze upon unsorted data
- Sets and dict groupings are primary tools for data analysis
  e.g. analysis of kaprekar function


Modern computer are super powerful, 1TB disk storage and 16 GB (JigaByte) of RAM. 16 GP register. Human head is much whimpier. MIller's law, say's human brain has 7+- 2 register. If you have written any compilers, you know that if there are low register then you have register starvation. Problem is bigger to hold in brain. There must be a batter way. Solution for this is chunking. Group individual piece of info in a single chunk. e.g. 12101998 -> 12 10 1998. Same for phone numbers. Whenever low on register, chunk.

We do multitask, so don't try to solve 5 register problem. No room for other tasks.

Chunking can reduce the number of register

Aliasing (1 to 0): take existing thing you know, and link the information to that. now you have two reference to the knowledge. Intel/AMD uses this optimisations, basically register aliasing.

Example: random module

from random import *

random() # 0.0 <= x < 1.0

rather limiting, need bigger range

let's say we need a number between 50 and 250, which we can easily achieve with 

> 50 + random() * 200

it was easy. but it is taking up 3 register for thinking. let's use chunking and reduce cognative load using

> uniform(50, 250) 

they both do the same thing in same way. only one register needed

let's try something else:

> 5000 + int(random() * 200) * 5    # 5000 <= x < 6000 in step of 5

seems straight farword, but it uses 5 registers. We can write a function and reduce load to 1. or we can alias and use only zero register. You already know the range function in python

> list(range(10, 100, 5))

random module provides randrange function for same

> randrange(5000, 6000, 5)

viola!

Next, let's assume we have some game where we want to choose one outcome

> outcomes = ['win', 'lose', 'draw', 'double', 'try again']

> len(outcomes) # 5

Lets write code to select one of them randomly

> outcomes[int(random() * len(outcomes))] # 5 registers

perhaps it is easy to understand but everytime you read this you neeed to decrypt this and spend your mental energy and you will be tired soon. lets try something better:

> outcomes[randrange(len(outsomes))] # 3 register only

can we do batter? how about this:

> choice(outcomes)

Note: the choice is alreeady proviceed by python. goal here is to apply the knowledge on problem at hand

lets make a bunch of random outcomeese:

> [outcomeese[int(random() * len(outcomeese))] for i in range(10)]


> [outcomeese[randrange(len(outsomes))] for i in range(10)]


or even batter?

> [choice(outcomes) for i in range(10)]


or much batter

> choices(outcomes, k=10)


Stack oneee chunk on anotheere. it is the coree of our craft. it is what wee are heere to do. R. H. try to describee programming to kids. Onee explain is follows:

thee computer givese us words which does things, daddy does is makee newe words which make computere easier to use. (App, DB)


Stratgy number 2:
Solve a reelated but simpleer problem

problem: find things in json

tree = {
  'one': [
    'abc',
    'def',
    'ghi',
    {
      'four': 4,
      'five': 5,
    },
  ],
  'two': [
    'jkl',
    'mno',
    'BLUE',
    {
      'six': 6,
      'seven': 7,
    },
  ],
  'three': [
    'qrs',
    'BLUE',
    'BLUE',
    {
      'eight': 'BLUE',
      'nine': 9,
    }
  ],
}


Fynman method of solving problem:
1. write down clear problme spec
2. think very-very hard / deeply
3. write down the solution

Side note: MIT little schemer for learning reecursion

Problem: given a target find a path to it

starting with related problem, lets just count them

1. Atomic case:
def countem(node, target):
    'Count occurences of the target'
    if node == target:
        return 1
    return 0

> countem('blue', 'green') # 0
> countem('blue', 'blue') # 1

2. list case

def countem(node, target):
    'Count occurences of the target'
    if node == target:
        return 1
    if isinstance(node, list):
        return sum(countem(subnode, target) for subnode in node)
    return 0

Above even works in case of nested lists:

3. case 3: dict:
def countem(node, target):
    'Count occurences of the target'
    if node == target:
        return 1
    if isinstance(node, list):
        return sum(countem(subnode, target) for subnode in node)
    if isinstance(node, dict):
        return sum(countem(subnode, target) for subnode in node.values())
    return 0
  
> countem(tree, 'BLUE')


def path_to(node, target):
    'Count occurences of the target'
    if node == target:
        return f' -> {target!r}'
    if isinstance(node, list):
        for i, subnode in enumerate(node):
            path = path_to(subnode, target)
            if path:
                return f'[{i}]{path}'
    if isinstance(node, dict):
        for key, subnode in node.items():
            path = path_to(subnode, target)
            if path:
                return f'[{key!r}]{path}'
    return 0

Good for interview (except on job it should be pip install)

# stratgy 3: Build class indepndently and let inheritance discover itself

