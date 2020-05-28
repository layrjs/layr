import {AttributeSelector, iterateOverAttributeSelector} from '@liaison/component';
import {PlainObject, isPlainObject, deleteUndefinedProperties} from 'core-helpers';

export type Document = PlainObject;

export type Projection = {[name: string]: 1};

export type DocumentPatch = {$set?: PlainObject; $unset?: {[name: string]: 1}};

// {a: true, b: {c: true}} => {__component: 1, a: 1, "b.__component": 1, "b.c": 1}
export function buildProjection(attributeSelector: AttributeSelector) {
  if (typeof attributeSelector === 'boolean') {
    if (attributeSelector === true) {
      return undefined;
    }

    return {__component: 1} as Projection; // Always include the '__component' attribute
  }

  const projection: Projection = {};

  const build = function (attributeSelector: Exclude<AttributeSelector, boolean>, path: string) {
    attributeSelector = {__component: true, ...attributeSelector};

    for (const [name, subattributeSelector] of iterateOverAttributeSelector(attributeSelector)) {
      const subpath = (path !== '' ? path + '.' : '') + name;

      if (typeof subattributeSelector === 'boolean') {
        if (subattributeSelector === true) {
          projection[subpath] = 1;
        }
      } else {
        build(subattributeSelector, subpath);
      }
    }
  };

  build(attributeSelector, '');

  return projection;
}

export function buildDocumentPatch(document: Document) {
  const documentPatch: DocumentPatch = {};

  const build = function (document: unknown, path: string) {
    if (document === undefined) {
      if (documentPatch.$unset === undefined) {
        documentPatch.$unset = {};
      }

      documentPatch.$unset[path] = 1;

      return;
    }

    if (isPlainObject(document) && '__component' in document) {
      for (const [name, value] of Object.entries(document)) {
        const subpath = (path !== '' ? path + '.' : '') + name;
        build(value, subpath);
      }

      return;
    }

    if (isPlainObject(document) || Array.isArray(document)) {
      deleteUndefinedProperties(document);
    }

    if (documentPatch.$set === undefined) {
      documentPatch.$set = {};
    }

    documentPatch.$set[path] = document;
  };

  build(document, '');

  return documentPatch;
}
