import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

interface PaperAttributes {
  id: number;
  title: string;
  authors: string;
  abstract: string | null;
  file_path: string;
  file_size: number | null;
  original_filename: string | null;
  uploader_id: number;
  presentation_date: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface PaperCreationAttributes extends Optional<PaperAttributes, 'id' | 'abstract' | 'file_size' | 'original_filename' | 'presentation_date' | 'created_at' | 'updated_at'> {}

class Paper extends Model<PaperAttributes, PaperCreationAttributes> implements PaperAttributes {
  public id!: number;
  public title!: string;
  public authors!: string;
  public abstract!: string | null;
  public file_path!: string;
  public file_size!: number | null;
  public original_filename!: string | null;
  public uploader_id!: number;
  public presentation_date!: Date | null;
  public created_at!: Date;
  public updated_at!: Date;
}

Paper.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(500), allowNull: false },
    authors: { type: DataTypes.STRING(500), allowNull: false },
    abstract: { type: DataTypes.TEXT },
    file_path: { type: DataTypes.STRING(500), allowNull: false },
    file_size: { type: DataTypes.INTEGER },
    original_filename: { type: DataTypes.STRING(255) },
    uploader_id: { type: DataTypes.INTEGER, allowNull: false },
    presentation_date: { type: DataTypes.DATEONLY },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: 'papers',
    timestamps: true,
    underscored: true,
  }
);

export default Paper;
