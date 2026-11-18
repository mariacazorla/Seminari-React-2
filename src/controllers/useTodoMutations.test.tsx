import { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TodoProvider, useTodoContext } from '../context/TodoContext';
import { NotificationProvider } from '../context/NotificationContext';
import { Todo } from '../models/todo.model';
import { getTodoById, updateTodo } from '../services/todo.service';
import { useTodoDetail } from './useTodoDetail';

jest.mock('../services/todo.service');

const original: Todo = { id: '1', title: 'Estudiar React', description: '', completed: false };
const mockGet = getTodoById as jest.MockedFunction<typeof getTodoById>;
const mockUpdate = updateTodo as jest.MockedFunction<typeof updateTodo>;

const TestPage = ({ cached }: { cached: boolean }): JSX.Element => {
  const { dispatch } = useTodoContext();
  useEffect(() => {
    if (cached) dispatch({ type: 'fetch_todos_success', payload: [original] });
  }, [cached, dispatch]);
  const { todo, toggle, isPending } = useTodoDetail('1');
  return (
    <button disabled={isPending} onClick={() => void toggle()}>
      {todo === null ? 'Cargando' : todo.completed ? 'Completada' : 'Pendiente'}
    </button>
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue(original);
});

describe.each([true, false])('Tarea en estado global: %s', (cached) => {
  test.each([true, false])('actualización optimista, respuesta correcta: %s', async (success) => {
    let resolve!: (todo: Todo) => void;
    let reject!: (error: Error) => void;
    mockUpdate.mockReturnValue(new Promise<Todo>((ok, fail) => {
      resolve = ok;
      reject = fail;
    }));
    render(
      <NotificationProvider>
        <TodoProvider><TestPage cached={cached} /></TodoProvider>
      </NotificationProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Pendiente' }));
    // El servidor todavía no ha contestado y el cambio ya se ve.
    expect(screen.getByRole('button', { name: 'Completada' })).toBeDisabled();
    await act(async () => {
      if (success) resolve({ ...original, completed: true });
      else reject(new Error('Fallo de conexión'));
    });
    expect(screen.getByRole('button', { name: success ? 'Completada' : 'Pendiente' })).toBeEnabled();
    expect(original.completed).toBe(false);
  });
});
