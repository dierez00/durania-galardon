import { ListProducerUpps } from "../application/use-cases/listProducerUpps";
import { GetProducerUppDetail } from "../application/use-cases/getProducerUppDetail";
import { ProducerUppsApiRepository } from "./api/producerUppsApi";

const repository = new ProducerUppsApiRepository();

export const listProducerUppsUseCase = new ListProducerUpps(repository);
export const getProducerUppDetailUseCase = new GetProducerUppDetail(repository);
