import { IsNotEmpty, IsUUID } from 'class-validator';
export class CreateGameDto {
  id: number;

  @IsNotEmpty()
  gameId: string;

  @IsNotEmpty()
  mode: 'classic' | 'doublepaddle' | 'goalkeeper';

  @IsUUID()
  playerOne: string;

  @IsUUID()
  playerTwo: string;

  scoreOne: number;

  scoreTwo: number;

  status: 0 | 1;
}

export class UpdateGameDto {
  scoreOne?: number;

  scoreTwo?: number;

  status?: 0 | 1;

  winner?: string;
}
