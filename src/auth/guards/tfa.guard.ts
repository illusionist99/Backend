import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';




export class tfaGuard extends AuthGuard('tfa') {}