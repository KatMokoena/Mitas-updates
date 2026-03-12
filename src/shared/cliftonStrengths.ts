// Shared CliftonStrengths constants for use in both frontend and backend

// All 34 CliftonStrengths themes
export const ALL_CLIFTON_STRENGTHS = [
  // Executing
  'Achiever',
  'Arranger',
  'Belief',
  'Consistency',
  'Deliberative',
  'Discipline',
  'Focus',
  'Responsibility',
  'Restorative',
  // Influencing
  'Activator',
  'Command',
  'Communication',
  'Competition',
  'Maximizer',
  'Self-Assurance',
  'Significance',
  'Woo',
  // Relationship Building
  'Adaptability',
  'Developer',
  'Connectedness',
  'Empathy',
  'Harmony',
  'Includer',
  'Individualization',
  'Positivity',
  'Relator',
  // Strategic Thinking
  'Analytical',
  'Context',
  'Futuristic',
  'Ideation',
  'Input',
  'Intellection',
  'Learner',
  'Strategic',
];

// Strength descriptions and categories
export const STRENGTH_DETAILS: Record<string, { category: string; description: string; quote: string }> = {
  'Achiever': {
    category: 'Executing',
    description: 'You have a constant need for achievement. You feel as if every day starts at zero. By the end of the day you must achieve something tangible in order to feel good about yourself.',
    quote: 'Excellence is not a skill, it\'s an attitude.'
  },
  'Arranger': {
    category: 'Executing',
    description: 'You are a conductor. When faced with a complex situation involving many factors, you enjoy managing all of the variables, aligning and realigning them until you are sure you have arranged them in the most productive configuration possible.',
    quote: 'The best way to get things done is to begin.'
  },
  'Belief': {
    category: 'Executing',
    description: 'You have certain core values that are enduring. These values are usually family-oriented, altruistic, or spiritual. Your value system affects your behavior in many ways.',
    quote: 'Values are like fingerprints. Nobody\'s are the same, but you leave them all over everything you do.'
  },
  'Consistency': {
    category: 'Executing',
    description: 'Balance is important to you. You are keenly aware of the need to treat people the same, no matter what their station in life, so you do not want to see the scales tipped too far in any one person\'s favor.',
    quote: 'Consistency is the last refuge of the unimaginative.'
  },
  'Deliberative': {
    category: 'Executing',
    description: 'You are careful. You are vigilant. You are a private person. You know that the world is an unpredictable place. Everything may seem in order, but beneath the surface you sense the many risks.',
    quote: 'Take time to deliberate, but when the time for action has arrived, stop thinking and go in.'
  },
  'Discipline': {
    category: 'Executing',
    description: 'Your world needs to be predictable. You need to feel in control. And so you instinctively impose structure on your world. You set up routines. You focus on timelines and deadlines.',
    quote: 'Discipline is the bridge between goals and accomplishment.'
  },
  'Focus': {
    category: 'Executing',
    description: 'You need a clear destination. Lacking one, your life and your work can quickly become frustrating. And so each year, each month, and perhaps each week you set goals.',
    quote: 'The successful warrior is the average man with laser-like focus.'
  },
  'Responsibility': {
    category: 'Executing',
    description: 'You take psychological ownership of anything you commit to, and whether large or small, you feel emotionally bound to follow it through to completion.',
    quote: 'The price of greatness is responsibility.'
  },
  'Restorative': {
    category: 'Executing',
    description: 'You are a problem solver. You enjoy the challenge of analyzing the symptoms, identifying what is wrong, and finding the solution.',
    quote: 'Problems are not stop signs, they are guidelines.'
  },
  'Activator': {
    category: 'Influencing',
    description: 'When you can, you act. You know that analysis has its place, but ultimately you believe that action is the only thing that matters. Only action leads to performance.',
    quote: 'The way to get started is to quit talking and begin doing.'
  },
  'Command': {
    category: 'Influencing',
    description: 'You have presence. You can take control of a situation and make decisions. When things get chaotic, people look to you to set things straight.',
    quote: 'The best leaders are those most interested in surrounding themselves with assistants and associates smarter than they are.'
  },
  'Communication': {
    category: 'Influencing',
    description: 'You like to explain, to describe, to host, to speak in public, and to write. You want your ideas to survive. You want them to live on in the minds and actions of others.',
    quote: 'The single biggest problem in communication is the illusion that it has taken place.'
  },
  'Competition': {
    category: 'Influencing',
    description: 'You measure your progress against the performance of others. You strive to win first place and revel in contests.',
    quote: 'Competition makes us faster; collaboration makes us better.'
  },
  'Maximizer': {
    category: 'Influencing',
    description: 'Excellence, not average, is your measure. Taking something from below average to slightly above average takes a great deal of effort and in your opinion is not worth the time.',
    quote: 'Excellence is never an accident. It is always the result of high intention, sincere effort, and intelligent execution.'
  },
  'Self-Assurance': {
    category: 'Influencing',
    description: 'You have confidence in your strengths. You know that you are able to take risks, to present yourself to others, and to make decisions.',
    quote: 'Confidence is not "they will like me." Confidence is "I\'ll be fine if they don\'t."'
  },
  'Significance': {
    category: 'Influencing',
    description: 'You want to be very significant in the eyes of other people. In particular, you want to be recognized and heard. You want to stand out.',
    quote: 'The purpose of life is to discover your gift. The work of life is to develop it. The meaning of life is to give your gift away.'
  },
  'Woo': {
    category: 'Influencing',
    description: 'Woo stands for winning others over. You enjoy the challenge of meeting new people and getting them to like you. Strangers are rarely intimidating to you.',
    quote: 'People will forget what you said, people will forget what you did, but people will never forget how you made them feel.'
  },
  'Adaptability': {
    category: 'Relationship Building',
    description: 'You live in the moment. You don\'t see the future as a fixed destination. Instead, you see it as a place that you create out of the choices that you make right now.',
    quote: 'It is not the strongest of the species that survive, nor the most intelligent, but the one most responsive to change.'
  },
  'Developer': {
    category: 'Relationship Building',
    description: 'You see the potential in others. Very often, in fact, potential is all you see. In your view no individual is fully formed. On the contrary, each individual is a work in progress.',
    quote: 'The greatest good you can do for another is not just to share your riches but to reveal to him his own.'
  },
  'Connectedness': {
    category: 'Relationship Building',
    description: 'You have a faith in the links between all things. You believe there are few coincidences and that almost every event has a reason.',
    quote: 'We are all connected; to each other, biologically. To the earth, chemically. To the rest of the universe atomically.'
  },
  'Empathy': {
    category: 'Relationship Building',
    description: 'You can sense the emotions of those around you. You can feel what they are feeling as though their feelings are your own.',
    quote: 'Empathy is seeing with the eyes of another, listening with the ears of another, and feeling with the heart of another.'
  },
  'Harmony': {
    category: 'Relationship Building',
    description: 'You look for areas of agreement. In your view there is little to be gained from conflict and friction, so you seek to hold them to a minimum.',
    quote: 'Harmony makes small things grow, lack of it makes great things decay.'
  },
  'Includer': {
    category: 'Relationship Building',
    description: 'Stretch the circle wider. This is the philosophy around which you orient your life. You want to include people and make them feel part of the group.',
    quote: 'Diversity is being invited to the party; inclusion is being asked to dance.'
  },
  'Individualization': {
    category: 'Relationship Building',
    description: 'You are intrigued by the unique qualities of each person. You are impatient with generalizations or "types" because you don\'t want to obscure what is special and distinct about each person.',
    quote: 'Everyone is a genius. But if you judge a fish by its ability to climb a tree, it will live its whole life believing that it is stupid.'
  },
  'Positivity': {
    category: 'Relationship Building',
    description: 'You are generous with praise, quick to smile, and always on the lookout for the positive in the situation. Some call you lighthearted. Others just wish that their glass were as full as yours seems to be.',
    quote: 'A positive attitude may not solve all your problems, but it will annoy enough people to make it worth the effort.'
  },
  'Relator': {
    category: 'Relationship Building',
    description: 'You enjoy close relationships with others. You find deep satisfaction in working hard with friends to achieve a goal.',
    quote: 'The quality of your life is the quality of your relationships.'
  },
  'Analytical': {
    category: 'Strategic Thinking',
    description: 'You search for reasons and causes. You have the ability to think about all the factors that might affect a situation.',
    quote: 'Data is not information, information is not knowledge, knowledge is not understanding, understanding is not wisdom.'
  },
  'Context': {
    category: 'Strategic Thinking',
    description: 'You look back. You look back because that is where the answers lie. You look back to understand the present.',
    quote: 'Those who cannot remember the past are condemned to repeat it.'
  },
  'Futuristic': {
    category: 'Strategic Thinking',
    description: 'You are inspired by the future and what could be. You energize others with your visions of the future.',
    quote: 'The future belongs to those who believe in the beauty of their dreams.'
  },
  'Ideation': {
    category: 'Strategic Thinking',
    description: 'You are fascinated by ideas. You are able to find connections between seemingly disparate phenomena.',
    quote: 'Ideas are like rabbits. You get a couple and learn how to handle them, and pretty soon you have a dozen.'
  },
  'Input': {
    category: 'Strategic Thinking',
    description: 'You are inquisitive. You collect things. You might collect information, words, facts, books, or quotations.',
    quote: 'The more that you read, the more things you will know. The more that you learn, the more places you\'ll go.'
  },
  'Intellection': {
    category: 'Strategic Thinking',
    description: 'You like to think. You like mental activity. You like to exercise the "muscles" of your brain, stretching them in multiple directions.',
    quote: 'An investment in knowledge pays the best interest.'
  },
  'Learner': {
    category: 'Strategic Thinking',
    description: 'You have a great desire to learn and want to continuously improve. The process of learning, rather than the outcome, excites you.',
    quote: 'Live as if you were to die tomorrow. Learn as if you were to live forever.'
  },
  'Strategic': {
    category: 'Strategic Thinking',
    description: 'You create alternative ways to proceed. Faced with any given scenario, you can quickly spot the relevant patterns and issues.',
    quote: 'Strategy without tactics is the slowest route to victory. Tactics without strategy is the noise before defeat.'
  },
};



