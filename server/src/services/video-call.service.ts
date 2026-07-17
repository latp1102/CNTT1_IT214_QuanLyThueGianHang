import { VideoCallRepository } from "../repositories/video-call.repository";
import { AppError } from "../middlewares/error";
import { HTTP_STATUS } from "../constants";

export class VideoCallService {
  private videoCallRepository = new VideoCallRepository();

  async create(data: { callerId: number; receiverId: number }) {
    return this.videoCallRepository.create({
      callerId: data.callerId,
      receiverId: data.receiverId,
      status: "missed"
    });
  }

  async startCall(id: number) {
    return this.videoCallRepository.update(id, {
      status: "ongoing",
      startedAt: new Date()
    });
  }

  async endCall(id: number) {
    const call = await this.videoCallRepository.findById(id);
    if (!call) {
      throw new AppError("Cuộc gọi không tồn tại.", HTTP_STATUS.NOT_FOUND);
    }

    const endedAt = new Date();
    let duration: number | undefined;
    if (call.startedAt) {
      duration = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000);
    }

    return this.videoCallRepository.update(id, {
      status: "completed",
      endedAt,
      duration
    });
  }

  async rejectCall(id: number) {
    return this.videoCallRepository.update(id, {
      status: "rejected",
      endedAt: new Date()
    });
  }

  async getHistory(userId: number, params: { page: number; limit: number }) {
    return this.videoCallRepository.findByUser(userId, params);
  }
}
