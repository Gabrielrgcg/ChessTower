import { BOARD_COLUMNS, VISIBLE_ROWS, type Coord, type Piece, type PlayableKind } from './types.ts'

export const isInsideBoard = ({ x, y }: Coord): boolean => x >= 0 && x < BOARD_COLUMNS && y >= 0 && y < VISIBLE_ROWS

export const pieceAt = (pieces: Piece[], x: number, y: number): Piece | undefined => {
  return pieces.find((piece) => piece.x === x && piece.y === y)
}

const isEnemyFor = (piece: Piece, target: Piece): boolean => {
  return target.side !== 'stone' && target.side !== piece.side
}

const canEnter = (pieces: Piece[], piece: Piece, coord: Coord): boolean => {
  if (!isInsideBoard(coord)) {
    return false
  }
  const target = pieceAt(pieces, coord.x, coord.y)
  return !target || isEnemyFor(piece, target)
}

const pushIfEnterable = (moves: Coord[], pieces: Piece[], piece: Piece, coord: Coord): void => {
  if (canEnter(pieces, piece, coord)) {
    moves.push(coord)
  }
}

const slidingMoves = (pieces: Piece[], piece: Piece, directions: Coord[]): Coord[] => {
  const moves: Coord[] = []
  for (const direction of directions) {
    let x = piece.x + direction.x
    let y = piece.y + direction.y
    while (isInsideBoard({ x, y })) {
      const target = pieceAt(pieces, x, y)
      if (!target) {
        moves.push({ x, y })
      } else {
        if (isEnemyFor(piece, target)) {
          moves.push({ x, y })
        }
        break
      }
      x += direction.x
      y += direction.y
    }
  }
  return moves
}

const pawnMoves = (pieces: Piece[], piece: Piece, special: boolean): Coord[] => {
  const moves: Coord[] = []
  const direction = piece.side === 'enemy' ? -1 : 1
  const forward = { x: piece.x, y: piece.y + direction }
  if (isInsideBoard(forward) && !pieceAt(pieces, forward.x, forward.y)) {
    moves.push(forward)
    const twoForward = { x: piece.x, y: piece.y + direction * 2 }
    if (special && isInsideBoard(twoForward) && !pieceAt(pieces, twoForward.x, twoForward.y)) {
      moves.push(twoForward)
    }
  }

  for (const dx of [-1, 1]) {
    const targetCoord = { x: piece.x + dx, y: piece.y + direction }
    if (!isInsideBoard(targetCoord)) {
      continue
    }
    const target = pieceAt(pieces, targetCoord.x, targetCoord.y)
    if (target && isEnemyFor(piece, target)) {
      moves.push(targetCoord)
    }
  }

  return moves
}

export const getLegalMoves = (pieces: Piece[], piece: Piece): Coord[] => {
  if (piece.side === 'stone' || piece.kind === 'stone') {
    return []
  }
  if (piece.movesRemaining !== null && piece.movesRemaining <= 0) {
    return []
  }
  if (piece.side === 'enemy' && piece.modifiers.includes('immobile')) {
    return []
  }

  const kind = piece.kind as PlayableKind
  switch (kind) {
    case 'pawn':
      return pawnMoves(pieces, piece, false)
    case 'specialPawn':
      return pawnMoves(pieces, piece, true)
    case 'king': {
      const moves: Coord[] = []
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx !== 0 || dy !== 0) {
            pushIfEnterable(moves, pieces, piece, { x: piece.x + dx, y: piece.y + dy })
          }
        }
      }
      return moves
    }
    case 'queen':
      return slidingMoves(pieces, piece, [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: -1 },
      ])
    case 'rook':
      return slidingMoves(pieces, piece, [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ])
    case 'bishop':
      return slidingMoves(pieces, piece, [
        { x: 1, y: 1 },
        { x: -1, y: 1 },
        { x: 1, y: -1 },
        { x: -1, y: -1 },
      ])
    case 'knight': {
      const moves: Coord[] = []
      for (const coord of [
        { x: piece.x + 1, y: piece.y + 2 },
        { x: piece.x - 1, y: piece.y + 2 },
        { x: piece.x + 1, y: piece.y - 2 },
        { x: piece.x - 1, y: piece.y - 2 },
        { x: piece.x + 2, y: piece.y + 1 },
        { x: piece.x - 2, y: piece.y + 1 },
        { x: piece.x + 2, y: piece.y - 1 },
        { x: piece.x - 2, y: piece.y - 1 },
      ]) {
        pushIfEnterable(moves, pieces, piece, coord)
      }
      return moves
    }
  }
}

export const coordsEqual = (left: Coord, right: Coord): boolean => left.x === right.x && left.y === right.y
