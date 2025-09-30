import { GoogleGenAI } from "@google/genai";
import { Student, LogEntry, LogCategory } from '../types';

if (!process.env.API_KEY) {
  // This is a placeholder for deployment. In Netlify, you'll set the API_KEY as an environment variable.
  console.info("API_KEY will be provided by the deployment environment.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAISuggestion = async (student: Student, logEntry: LogEntry, recentLogs: LogEntry[]): Promise<string> => {
  try {
    const history = recentLogs.map(log => `- Ngày ${new Date(log.date).toLocaleDateString('vi-VN')}: ${log.content} (${log.category})`).join('\n');

    let situationDetails;
    let guidanceFocus;

    if (logEntry.category === LogCategory.ACADEMIC_REVIEW) {
        situationDetails = `
        - Phân loại: ${logEntry.category}
        - Môn học: ${logEntry.subject}
        - Mức độ hoàn thành: ${logEntry.grade}
        - Nhận xét chi tiết: "${logEntry.content}"
      `;
      guidanceFocus = "Các giải pháp cần tập trung vào việc hỗ trợ học tập, tìm ra nguyên nhân và đề xuất phương pháp giúp học sinh tiến bộ trong môn học này.";
    } else {
        situationDetails = `
        - Phân loại: ${logEntry.category} (${logEntry.sentiment || 'Không có'})
        - Nội dung: "${logEntry.content}"
      `;
      guidanceFocus = "Các giải pháp cần tập trung vào các phương pháp tích cực, khuyến khích thay vì trừng phạt.";
    }


    const prompt = `
      Với vai trò là một chuyên gia giáo dục tiểu học và tâm lý học đường giàu kinh nghiệm, hãy đưa ra các gợi ý và giải pháp cụ thể, mang tính xây dựng cho tình huống sau:

      Học sinh: ${student.name}
      Tình huống cần tư vấn (ghi nhận ngày ${new Date(logEntry.date).toLocaleDateString('vi-VN')}):
      ${situationDetails}

      Bối cảnh bổ sung (một vài ghi nhận gần đây của học sinh ${student.name}):
      ${history || "Chưa có ghi nhận nào gần đây."}

      Dựa trên thông tin trên, hãy đề xuất 3-4 giải pháp hoặc hướng tiếp cận khả thi mà một giáo viên chủ nhiệm có thể áp dụng. Các giải pháp cần:
      1. Phù hợp với lứa tuổi tiểu học.
      2. Cung cấp các bước hành động cụ thể.
      3. ${guidanceFocus}
      4. Ngôn ngữ chuyên nghiệp, đồng cảm và hỗ trợ.

      Vui lòng trình bày câu trả lời dưới dạng các gạch đầu dòng rõ ràng.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.";
  }
};

export const getAIStudentSummary = async (student: Student, allLogs: LogEntry[]): Promise<string> => {
  try {
    const formattedLogs = allLogs
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(log => {
        let details = '';
        if (log.category === LogCategory.ACADEMIC_REVIEW) {
          details = `Môn ${log.subject} (${log.grade}): ${log.content}`;
        } else if (log.category === LogCategory.BEHAVIOR) {
          details = `Hành vi (${log.sentiment}): ${log.content}`;
        } else {
          details = `${log.category}: ${log.content}`;
        }
        return `- Ngày ${new Date(log.date).toLocaleDateString('vi-VN')}: ${details}`;
      })
      .join('\n');

    const prompt = `
      Với vai trò là một chuyên gia giáo dục tiểu học và tâm lý học đường, hãy phân tích toàn bộ các ghi nhận sau đây về học sinh ${student.name}.

      Lịch sử ghi nhận:
      ${formattedLogs}

      Dựa trên toàn bộ lịch sử ghi nhận này, hãy đưa ra một bản tổng hợp và đánh giá toàn diện về học sinh. Báo cáo của bạn cần bao gồm 3 phần rõ ràng với tiêu đề in đậm:
      1. **Điểm mạnh nổi bật:** Xác định các xu hướng hành vi tích cực và các môn học mà học sinh thể hiện tốt.
      2. **Lĩnh vực cần cải thiện:** Chỉ ra các thách thức về hành vi hoặc học tập mà học sinh đang gặp phải một cách nhất quán.
      3. **Gợi ý chiến lược cho giáo viên:** Đề xuất 2-3 chiến lược cụ thể, khả thi mà giáo viên có thể áp dụng để hỗ trợ sự phát triển toàn diện của học sinh, dựa trên những phân tích ở trên.

      Vui lòng trình bày với văn phong chuyên nghiệp, mang tính xây dựng, tích cực và sử dụng định dạng Markdown cho các tiêu đề và danh sách.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\* (.*?)(?=\n\*|\n\n|$)/g, '<li>$1</li>');
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Đã xảy ra lỗi khi kết nối với AI. Vui lòng thử lại sau.";
  }
};