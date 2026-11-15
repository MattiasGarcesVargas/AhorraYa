import { interpretarImporteOCero } from '@/lib/dinero';

import type { Categoria, DatosCategoria } from '../categorias.types';
import {
  CATEGORIAS_DE_PARTIDA,
  colorSugerido,
  crearCatalogo,
  moverEnOrden,
  totalPresupuestoMensual,
} from '../utils/catalogo';
import {
  motivoParaNoEliminar,
  nuevoIdCategoria,
  validarCategoria,
} from '../utils/validar-categoria';

const GIMNASIO: DatosCategoria = {
  nombre: 'Gimnasio',
  icono: 'fitness-outline',
  color: 'cat-7',
  limiteMensualCentavos: 2_000,
};

describe('validarCategoria', () => {
  it('acepta una categoría nueva y limpia espacios del nombre', () => {
    const resultado = validarCategoria(
      { ...GIMNASIO, nombre: '  Gimnasio   del  barrio ' },
      CATEGORIAS_DE_PARTIDA,
    );
    expect(resultado).toEqual({ ok: true, datos: { ...GIMNASIO, nombre: 'Gimnasio del barrio' } });
  });

  it.each(['comida', 'COMIDA', ' Cómida '])('rechaza "%s": ya existe Comida', (nombre) => {
    const resultado = validarCategoria({ ...GIMNASIO, nombre }, CATEGORIAS_DE_PARTIDA);
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.errores.nombre).toMatch(/Ya tienes/);
  });

  it('al editar, su propio nombre no cuenta como repetido', () => {
    const comida = CATEGORIAS_DE_PARTIDA[2];
    expect(
      validarCategoria({ ...comida, nombre: 'Comida' }, CATEGORIAS_DE_PARTIDA, comida.id).ok,
    ).toBe(true);
  });

  it('exige nombre, ícono y color válidos, y un límite entero no negativo', () => {
    const resultado = validarCategoria(
      {
        nombre: ' ',
        icono: 'no-existe' as DatosCategoria['icono'],
        color: 'rojo' as DatosCategoria['color'],
        limiteMensualCentavos: -1,
      },
      [],
    );
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) {
      expect(Object.keys(resultado.errores).sort()).toEqual(
        ['color', 'icono', 'limiteMensualCentavos', 'nombre'].sort(),
      );
    }
  });

  it('rechaza nombres de más de 24 caracteres', () => {
    expect(validarCategoria({ ...GIMNASIO, nombre: 'x'.repeat(25) }, []).ok).toBe(false);
  });

  it('permite límite 0 (sin tope)', () => {
    expect(validarCategoria({ ...GIMNASIO, limiteMensualCentavos: 0 }, []).ok).toBe(true);
  });
});

describe('eliminar categorías', () => {
  const [transporte, novia] = CATEGORIAS_DE_PARTIDA;

  it('sin gastos se puede eliminar directamente', () => {
    expect(motivoParaNoEliminar(CATEGORIAS_DE_PARTIDA, transporte.id, 0, null)).toBeNull();
  });

  it('con gastos exige elegir otra categoría que exista', () => {
    expect(motivoParaNoEliminar(CATEGORIAS_DE_PARTIDA, transporte.id, 3, null)).toMatch(/Elige/);
    expect(motivoParaNoEliminar(CATEGORIAS_DE_PARTIDA, transporte.id, 3, transporte.id)).toMatch(
      /otra/,
    );
    expect(motivoParaNoEliminar(CATEGORIAS_DE_PARTIDA, transporte.id, 3, 'fantasma')).toMatch(
      /otra/,
    );
    expect(motivoParaNoEliminar(CATEGORIAS_DE_PARTIDA, transporte.id, 3, novia.id)).toBeNull();
  });

  it('nunca deja la app sin categorías', () => {
    expect(motivoParaNoEliminar([transporte], transporte.id, 0, null)).toMatch(/al menos una/);
  });
});

describe('catálogo', () => {
  const catalogo = crearCatalogo(CATEGORIAS_DE_PARTIDA);

  it('busca por id, nombre o alias sin tildes ni mayúsculas', () => {
    expect(catalogo.buscar('Imprevistos')?.id).toBe('imprevistos');
    expect(catalogo.buscar('ALMUERZO')?.id).toBe('comida');
    expect(catalogo.buscar('Mascotas')).toBeUndefined();
  });

  it('un id desconocido devuelve "Sin categoría" en vez de fallar', () => {
    expect(catalogo.porId('borrada')).toMatchObject({ id: 'borrada', nombre: 'Sin categoría' });
  });

  it('respeta el orden elegido', () => {
    const desordenadas: Categoria[] = [
      { ...CATEGORIAS_DE_PARTIDA[0], orden: 2 },
      { ...CATEGORIAS_DE_PARTIDA[1], orden: 0 },
      { ...CATEGORIAS_DE_PARTIDA[2], orden: 1 },
    ];
    expect(crearCatalogo(desordenadas).lista.map((c) => c.id)).toEqual([
      'novia',
      'comida',
      'transporte',
    ]);
  });

  it('el presupuesto total suma los límites ($320 del plan)', () => {
    expect(totalPresupuestoMensual(CATEGORIAS_DE_PARTIDA)).toBe(32_000);
  });

  it('sugiere un tono que todavía no se use', () => {
    expect(['cat-7', 'cat-8']).toContain(colorSugerido(CATEGORIAS_DE_PARTIDA));
  });
});

describe('orden e ids', () => {
  it('mueve una categoría un lugar arriba o abajo, sin salirse de la lista', () => {
    expect(moverEnOrden(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c']);
    expect(moverEnOrden(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b']);
    expect(moverEnOrden(['a', 'b', 'c'], 'a', -1)).toEqual(['a', 'b', 'c']);
    expect(moverEnOrden(['a', 'b', 'c'], 'c', 1)).toEqual(['a', 'b', 'c']);
  });

  it('genera ids que no chocan con los de las categorías iniciales', () => {
    const id = nuevoIdCategoria(Date.UTC(2026, 10, 8), 0.5);
    expect(id).toMatch(/^c-[0-9a-z]+$/);
    expect(CATEGORIAS_DE_PARTIDA.map((c) => c.id)).not.toContain(id);
    expect(nuevoIdCategoria(1, 0.1)).not.toBe(nuevoIdCategoria(1, 0.2));
  });
});

describe('límite escrito a mano', () => {
  it.each([
    ['', 0],
    ['0', 0],
    ['0.00', 0],
    ['$ 0,0', 0],
    ['40', 4_000],
    ['12,50', 1_250],
  ])('"%s" → %i centavos', (texto, esperado) => {
    expect(interpretarImporteOCero(texto)).toBe(esperado);
  });

  it('rechaza lo que no es un importe', () => {
    expect(interpretarImporteOCero('abc')).toBeNull();
  });
});
