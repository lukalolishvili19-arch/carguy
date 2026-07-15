import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** Email or username (e.g. test1) */
  @IsString()
  @MinLength(1)
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}
