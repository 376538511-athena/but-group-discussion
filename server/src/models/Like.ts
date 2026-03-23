import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface LikeAttributes {
  id: number;
  comment_id: number;
  user_id: number;
  created_at: Date;
}

interface LikeCreationAttributes extends Optional<LikeAttributes, 'id' | 'created_at'> {}

class Like extends Model<LikeAttributes, LikeCreationAttributes> implements LikeAttributes {
  public id!: number;
  public comment_id!: number;
  public user_id!: number;
  public created_at!: Date;
}

Like.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    comment_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'likes',
    timestamps: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ['comment_id', 'user_id'] },
    ],
  }
);

export default Like;
