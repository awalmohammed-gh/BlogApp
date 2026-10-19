import api from "../../api/axios";

/** Public aggregate newsroom figures (readers in the last 30 days, active desks, published stories). */
export const publicStatsService = {
  async getStats() {
    const response = await api.get("/site/stats");
    return response.data;
  }
};

export default publicStatsService;
