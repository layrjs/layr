import {Model, field} from './model';

export const ModelList = modelName =>
  class ModelList extends Model {
    @field(`${modelName}[]`) items;
  };
