const String baseUrl = "https://coursehubiitg.in/api";

class MiscellaneousEndpoints {
  static const String examDates =
      '$baseUrl/exam'; //Needs params : semester_number
  static const String contributionList = '$baseUrl/contribution/';
  static const String guestLogin = '$baseUrl/auth/login/guest/';
  static const String funFacts = '$baseUrl/miscellaneous/fun-facts/';
  static const String getTimetable = '$baseUrl/timetable/';
  static const String postFeedbackBug = '$baseUrl/miscellaneous/report/';
}

class CoursesEndpoints {
  static const String search = '$baseUrl/search/';
  static const String searchAvailable =
      '$baseUrl/search/available/'; // Needs params :course_code
  static const String course = '$baseUrl/course/'; //Needs params : course_code
  static const String addCourse =
      '$baseUrl/user/course/'; //Needs params : code ,name
  static const String isCourseUpdated = '$baseUrl/course/isUpdated/';
}

class FileEndpoints {
  static const String download =
      '$baseUrl/file/download/'; //Needs params : Onedrive-file-ID
  static const String preview =
      '$baseUrl/file/preview/'; //Needs params : Onedrive-file-ID
}

class UserEndpoints {
  static const String currentUser = '$baseUrl/user/';
  static const String addFav = '$baseUrl/user/favourites/';
  static const String removeFav = '$baseUrl/user/favourites/';
}

class ScheduleEndpoints{
  static const String createSchedule = '$baseUrl/schedule/';
  static const String updateSchedule = '$baseUrl/schedule/updateSchedule/';
  static const String addClass='$baseUrl/schedule/addClass';
  static const String addSubscribe='$baseUrl/schedule/subscribeNotification';
  static const String addDateCancelled='$baseUrl/schedule/datesCancelled';

}

class AuthEndpoints {
  static const String getAccess =
      'https://login.microsoftonline.com/850aa78d-94e1-4bc6-9cf3-8c11b530701c/oauth2/v2.0/authorize?client_id=89fc28dc-5aaf-471b-a9bf-f7411b5527f7&response_type=code&redirect_uri=https://www.coursehubiitg.in/api/auth/login/redirect/mobile&scope=offline_access%20user.read&state=12345&prompt=consent';
}

class ContributionEndpoints {
  static const String fileUpload = '$baseUrl/contribution/upload/mobile/';
}


