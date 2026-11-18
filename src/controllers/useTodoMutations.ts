import { useCallback } from 'react';
import { useTodoContext } from '../context/TodoContext';
import { Todo, TodoFormValues, TodoId, toCreateTodoDto } from '../models/todo.model';
import { getErrorMessage } from '../services/http.service';
import { createTodo, deleteTodo, updateTodo } from '../services/todo.service';
import { useNotifications } from './useNotifications';

/**
 * Controller de ESCRITURA: crear, modificar y eliminar tareas.
 *
 * Crear y eliminar esperan la respuesta del servidor.
 * Al completar una tarea, mostramos el cambio al momento y lo deshacemos si falla.
 *
 * Cada función devuelve un resultado (`Todo | null`, `boolean`) para que la
 * vista pueda reaccionar (limpiar el formulario, navegar...).
 */

export interface UseTodoMutationsResult {
  addTodo: (values: TodoFormValues) => Promise<Todo | null>;
  toggleTodo: (todo: Todo) => Promise<Todo | null>;
  removeTodo: (id: TodoId) => Promise<boolean>;
}

export const useTodoMutations = (): UseTodoMutationsResult => {
  const { dispatch } = useTodoContext();
  const { notify } = useNotifications();

  const addTodo = useCallback(
    async (values: TodoFormValues): Promise<Todo | null> => {
      try {
        const created: Todo = await createTodo(toCreateTodoDto(values));
        dispatch({ type: 'todo_added', payload: created });
        notify('success', `Tarea "${created.title}" creada.`);
        return created;
      } catch (error: unknown) {
        notify('error', `No se ha podido crear la tarea: ${getErrorMessage(error)}`);
        return null;
      }
    },
    [dispatch, notify],
  );

  const toggleTodo = useCallback(
    async (todo: Todo): Promise<Todo | null> => {
      dispatch({ type: 'mutation_start', payload: todo.id });
      // Conservamos todo sin modificarlo para poder volver atrás.
      dispatch({ type: 'todo_updated', payload: { ...todo, completed: !todo.completed } });
      try {
        // PATCH: solo enviamos el campo que cambia (modificación parcial).
        const updated: Todo = await updateTodo(todo.id, { completed: !todo.completed });
        dispatch({ type: 'todo_updated', payload: updated });
        notify('success', updated.completed ? 'Tarea completada.' : 'Tarea marcada como pendiente.');
        return updated;
      } catch (error: unknown) {
        dispatch({ type: 'todo_updated', payload: todo });
        notify('error', `No se ha podido actualizar la tarea: ${getErrorMessage(error)}`);
        return null;
      } finally {
        // `finally` se ejecuta SIEMPRE: el botón vuelve a habilitarse tanto si
        // la petición tuvo éxito como si falló.
        dispatch({ type: 'mutation_end', payload: todo.id });
      }
    },
    [dispatch, notify],
  );

  const removeTodo = useCallback(
    async (id: TodoId): Promise<boolean> => {
      dispatch({ type: 'mutation_start', payload: id });
      try {
        await deleteTodo(id);
        dispatch({ type: 'todo_removed', payload: id });
        notify('success', 'Tarea eliminada.');
        return true;
      } catch (error: unknown) {
        notify('error', `No se ha podido eliminar la tarea: ${getErrorMessage(error)}`);
        return false;
      } finally {
        dispatch({ type: 'mutation_end', payload: id });
      }
    },
    [dispatch, notify],
  );

  return { addTodo, toggleTodo, removeTodo };
};
