import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface UserAttributes {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  real_name: string;
  student_id: string | null;
  research_direction: string | null;
  avatar_url: string | null;
  role: 'admin' | 'member';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'student_id' | 'research_direction' | 'avatar_url' | 'role' | 'is_active' | 'created_at' | 'updated_at'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public email!: string;
  public password_hash!: string;
  public real_name!: string;
  public student_id!: string | null;
  public research_direction!: string | null;
  public avatar_url!: string | null;
  public role!: 'admin' | 'member';
  public is_active!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    real_name: { type: DataTypes.STRING(50), allowNull: false },
    student_id: { type: DataTypes.STRING(20), unique: true },
    research_direction: { type: DataTypes.STRING(200) },
    avatar_url: { type: DataTypes.STRING(500) },
    role: { type: DataTypes.ENUM('admin', 'member'), defaultValue: 'member' },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'users',
    timestamps: true,
    underscored: true,
  }
);

export default User;
