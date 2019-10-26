import {Model, method} from '@liaison/model';
import {Layer} from '@liaison/layer';

// time curl -v -X GET http://localhost:6789

// time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"Clock=>": {"getTime=>result": {"()": []}}}, "source": "frontend"}' http://localhost:6789

export default async function createLayer() {
  class Clock extends Model {
    @method({expose: {call: true}}) static getTime() {
      return new Date();
    }
  }

  return new Layer({Clock});
}
