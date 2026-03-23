import User from './User';
import Paper from './Paper';
import Comment from './Comment';
import Like from './Like';

// User -> Paper (one-to-many)
User.hasMany(Paper, { foreignKey: 'uploader_id', as: 'papers' });
Paper.belongsTo(User, { foreignKey: 'uploader_id', as: 'uploader' });

// User -> Comment (one-to-many)
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Paper -> Comment (one-to-many)
Paper.hasMany(Comment, { foreignKey: 'paper_id', as: 'comments' });
Comment.belongsTo(Paper, { foreignKey: 'paper_id', as: 'paper' });

// Comment -> Comment (self-referential for replies)
Comment.hasMany(Comment, { foreignKey: 'parent_id', as: 'replies' });
Comment.belongsTo(Comment, { foreignKey: 'parent_id', as: 'parent' });

// Comment -> Like (one-to-many)
Comment.hasMany(Like, { foreignKey: 'comment_id', as: 'likes' });
Like.belongsTo(Comment, { foreignKey: 'comment_id', as: 'comment' });

// User -> Like (one-to-many)
User.hasMany(Like, { foreignKey: 'user_id', as: 'likes' });
Like.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { User, Paper, Comment, Like };
