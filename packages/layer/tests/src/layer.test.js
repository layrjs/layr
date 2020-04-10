import {Component} from '@liaison/component';

import {Layer} from '../../..';

describe('Layer', () => {
  test('new Layer()', async () => {
    let layer = new Layer();

    expect(layer.getName()).toBeUndefined();

    expect(() => layer.getComponent('Movie')).toThrow(
      "The component class 'Movie' is not registered in the layer"
    );

    layer = new Layer([], {name: 'frontend'});

    expect(layer.getName()).toBe('frontend');

    expect(() => layer.getComponent('Movie')).toThrow(
      "The component class 'Movie' is not registered in the layer (layer name: 'frontend')"
    );

    class Movie extends Component {}

    class Actor extends Component {}

    layer = new Layer([Movie, Actor], {name: 'frontend'});

    expect(layer.getName()).toBe('frontend');
    expect(layer.getComponent('Movie')).toBe(Movie);
    expect(layer.getComponent('Actor')).toBe(Actor);
  });

  test('getComponent()', async () => {
    class Movie extends Component {}

    const layer = new Layer([Movie]);

    expect(layer.getComponent('Movie')).toBe(Movie);

    expect(layer.Movie).toBe(Movie);

    expect(() => layer.getComponent('Actor')).toThrow(
      "The component class 'Actor' is not registered in the layer"
    );

    layer.setName('frontend');

    expect(() => layer.getComponent('Actor')).toThrow(
      "The component class 'Actor' is not registered in the layer (layer name: 'frontend')"
    );
  });

  test('registerComponent()', async () => {
    const layer = new Layer();

    class Movie extends Component {}

    layer.registerComponent(Movie);

    expect(layer.getComponent('Movie')).toBe(Movie);

    expect(() => layer.registerComponent(Movie.prototype)).toThrow(
      "Expected a component class, but received a component instance (component name: 'movie')"
    );

    layer.setName('frontend');

    expect(() => layer.registerComponent(Movie.prototype)).toThrow(
      "Expected a component class, but received a component instance (layer name: 'frontend', component name: 'movie')"
    );

    layer.unsetName();

    class Film {}

    expect(() => layer.registerComponent(Film)).toThrow(
      "Expected a component class, but received a value of type 'Film'"
    );

    layer.setName('frontend');

    expect(() => layer.registerComponent(Film)).toThrow(
      "Expected a component class, but received a value of type 'Film' (layer name: 'frontend')"
    );

    layer.unsetName();

    class Actor extends Component {}

    const otherLayer = new Layer([Actor]);

    expect(() => layer.registerComponent(Actor)).toThrow(
      "Cannot register a component that is already registered (component name: 'Actor')"
    );

    layer.setName('frontend');

    expect(() => layer.registerComponent(Actor)).toThrow(
      "Cannot register a component that is already registered (requested layer name: 'frontend', component name: 'Actor')"
    );

    otherLayer.setName('backend');

    expect(() => layer.registerComponent(Actor)).toThrow(
      "Cannot register a component that is already registered (requested layer name: 'frontend', registered layer name: 'backend', component name: 'Actor')"
    );

    layer.unsetName();

    class OtherMovie extends Component {}

    OtherMovie.setComponentName('Movie');

    expect(() => layer.registerComponent(OtherMovie)).toThrow(
      "A component with the same name is already registered (component name: 'Movie')"
    );

    layer.setName('frontend');

    expect(() => layer.registerComponent(OtherMovie)).toThrow(
      "A component with the same name is already registered (layer name: 'frontend', component name: 'Movie')"
    );

    layer.unsetName();

    class Submovie extends Movie {}

    Submovie.setComponentName('Movie');

    expect(() => layer.registerComponent(Submovie)).toThrow(
      "A component with the same name is already registered (component name: 'Movie')"
    );

    class Fork extends Component {}

    layer.Fork = function() {};

    expect(() => layer.registerComponent(Fork)).toThrow(
      "Cannot register a component that has the same name as an existing property (component name: 'Fork')"
    );

    layer.setName('frontend');

    expect(() => layer.registerComponent(Fork)).toThrow(
      "Cannot register a component that has the same name as an existing property (layer name: 'frontend', component name: 'Fork')"
    );
  });

  test('getComponents()', async () => {
    class Movie extends Component {}

    class Actor extends Component {}

    const layer = new Layer();

    expect(Array.from(layer.getComponents())).toEqual([]);

    layer.registerComponent(Movie);

    expect(Array.from(layer.getComponents())).toEqual([Movie]);

    layer.registerComponent(Actor);

    expect(Array.from(layer.getComponents())).toEqual([Movie, Actor]);

    expect(
      Array.from(
        layer.getComponents({filter: component => component.getComponentName() === 'Actor'})
      )
    ).toEqual([Actor]);
  });

  test('fork()', async () => {
    class Movie extends Component {}

    const layer = new Layer([Movie]);
    const otherLayer = new Layer();

    const forkedLayer = layer.fork();

    expect(forkedLayer.isForkOf(layer)).toBe(true);
    expect(forkedLayer.isForkOf(otherLayer)).toBe(false);
    expect(forkedLayer.isForkOf(forkedLayer)).toBe(false);
    expect(layer.isForkOf(forkedLayer)).toBe(false);
    expect(layer.isForkOf(layer)).toBe(false);

    const forkedForkedLayer = forkedLayer.fork();

    expect(forkedForkedLayer.isForkOf(forkedLayer)).toBe(true);
    expect(forkedForkedLayer.isForkOf(layer)).toBe(true);

    const ForkedMovie = forkedLayer.getComponent('Movie');

    expect(ForkedMovie.isForkOf(Movie)).toBe(true);
    expect(ForkedMovie.prototype.isForkOf(Movie.prototype)).toBe(true);

    // Getting a component a second time should return the same forked component
    expect(forkedLayer.getComponent('Movie')).toBe(ForkedMovie);
  });

  test('detach() and isDetached()', async () => {
    class Movie extends Component {}

    const layer = new Layer([Movie]);

    const movie = new layer.Movie();

    expect(layer.isDetached()).toBe(false);
    expect(Movie.isDetached()).toBe(false);
    expect(movie.isDetached()).toBe(false);

    layer.detach();

    expect(layer.isDetached()).toBe(true);
    expect(Movie.isDetached()).toBe(true);
    expect(movie.isDetached()).toBe(true);
  });
});
