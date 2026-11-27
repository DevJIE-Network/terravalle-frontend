/*
 * HU-030 · Estado de favoritos: reductor puro (sin React) para poder probarlo por separado.
 *
 * `items` es la lista de favoritos tal como llega del API (o un marcador provisional mientras se
 * guarda). `busy` indica qué propiedades tienen una petición en curso ("adding" | "removing") y
 * `errors` el último mensaje de error por propiedad. Los cambios se muestran de inmediato
 * (actualización optimista) y, si el backend falla, se revierten con `mutateFailure`.
 */
import { favoriteKey } from '@/utils/favorites';

export const initialFavoritesState = Object.freeze({
  loaded: false,
  loading: false,
  loadError: '',
  items: [],
  busy: {},
  errors: {},
});

const keyOf = (item) => favoriteKey(item?.propertyId);

const omit = (map, key) => Object.fromEntries(Object.entries(map).filter(([name]) => name !== key));

function insertAt(list, entry, index) {
  const position = Math.min(Math.max(Number.isInteger(index) ? index : 0, 0), list.length);
  return [...list.slice(0, position), entry, ...list.slice(position)];
}

export function favoritesReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return initialFavoritesState;

    case 'loadStart':
      return { ...state, loading: true, loadError: '' };

    case 'loadSuccess': {
      const received = new Set(action.items.map(keyOf));
      // Lo que se está guardando y el servidor aún no lista se conserva; lo que se está quitando
      // se oculta aunque el servidor todavía lo liste.
      const saving = state.items.filter(
        (item) => state.busy[keyOf(item)] === 'adding' && !received.has(keyOf(item)),
      );
      const fromServer = action.items.filter((item) => state.busy[keyOf(item)] !== 'removing');
      return {
        ...state,
        loaded: true,
        loading: false,
        loadError: '',
        items: [...saving, ...fromServer],
      };
    }

    case 'loadFailure':
      return { ...state, loading: false, loadError: action.message };

    case 'mutateStart': {
      const rest = state.items.filter((item) => keyOf(item) !== action.id);
      return {
        ...state,
        items: action.kind === 'adding' ? insertAt(rest, action.entry, action.index) : rest,
        busy: { ...state.busy, [action.id]: action.kind },
        errors: omit(state.errors, action.id),
      };
    }

    case 'mutateSuccess':
      return { ...state, busy: omit(state.busy, action.id) };

    case 'mutateFailure': {
      const rest = state.items.filter((item) => keyOf(item) !== action.id);
      return {
        ...state,
        // Revertir: lo que se intentó guardar se quita; lo que se intentó quitar vuelve a su lugar.
        items: action.kind === 'removing' ? insertAt(rest, action.entry, action.index) : rest,
        busy: omit(state.busy, action.id),
        errors: { ...state.errors, [action.id]: action.message },
      };
    }

    case 'clearError':
      return { ...state, errors: omit(state.errors, action.id) };

    default:
      return state;
  }
}
