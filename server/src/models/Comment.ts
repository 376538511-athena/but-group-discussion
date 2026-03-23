import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface CommentAttributes {
  id: number;
  paper_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  created_at: Date;
  updated_at: Date;
}

interface CommentCreationAttributes extends Optional<CommentAttributes, 'id' | 'parent_id' | 'created_at' | 'updated_at'> {}

class Comment extends Model<CommentAttributes, CommentCreationAttributes> implements CommentAttributes {
  public id!: number;
  public paper_id!: number;
  public user_id!: number;
  public parent_id!: number | null;
  public content!: string;
  public created_at!: Date;
  public updated_at!: Date;

  // association fields
  public replies?: Comment[];
  public likes?: any[];
  public user?: any;
  public like_count?: number;
}

Comment.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    paper_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    parent_id: { type: DataTypes.INTEGER },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'comments',
    timestamps: true,
    underscored: true,
  }
);

export default Comment;
