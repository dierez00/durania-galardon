import { ApiBovinoRepository } from "./ApiBovinoRepository";
import { ListBovinos } from "../application/use-cases/listBovinos";
import { GetBovinoDetail } from "../application/use-cases/getBovinoDetail";

const bovinoRepository = new ApiBovinoRepository();

export const listBovinosUseCase = new ListBovinos(bovinoRepository);
export const getBovinoDetailUseCase = new GetBovinoDetail(bovinoRepository);
