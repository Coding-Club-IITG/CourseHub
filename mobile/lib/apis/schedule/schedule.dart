import 'dart:convert';
import 'dart:ffi';

import 'package:coursehub/models/schedule.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import '../../apis/protected.dart';
import '../../database/cache_store.dart';

void getDays() {
  int day = DateTime.now().weekday;

  if (day == 1) {
    final List<String> days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    CacheStore.daysOfTheWeek = days;
  } else if (day == 2) {
    final List<String> days = ['Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon'];
    CacheStore.daysOfTheWeek = days;
  } else if (day == 3) {
    final List<String> days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
    CacheStore.daysOfTheWeek = days;
  } else if (day == 4) {
    final List<String> days = ['Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed'];
    CacheStore.daysOfTheWeek = days;
  } else if (day == 5) {
    final List<String> days = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
    CacheStore.daysOfTheWeek=days;
  } else if (day == 6) {
    final List<String> days = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    CacheStore.daysOfTheWeek=days;
  } else if (day==7){
    final List<String> days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    CacheStore.daysOfTheWeek=days;
  }
}

Future<void> getSchedules() async {
  DateTime date=DateTime.now();
  try {
    List<DateTime> dates=[];
    for(int i=0;i<7;i++)
    {
      DateTime nextDate = date.add(Duration(days: i));
      dates.add(nextDate);
    }
    List<Future> concurrentTasks = [];
    for(int i=0;i<7;i++)
    {
      concurrentTasks.add(getSchedule(dates[i]));
    }
    await Future.wait(concurrentTasks);
  } catch (e) {
    rethrow;
  }
}

Future<void> getSchedule(DateTime date) async {

  List decodedResponse = [];
  final header = await getAccessToken();
  if (header == 'error') {
    throw 'token not found';
  }
  String formattedDate=DateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").format(date.toUtc());
  String dayName=DateFormat('EEE').format(date).toUpperCase();
  List scheduleList = CacheStore.schedule[dayName]??[];
  try {
    if (scheduleList.isEmpty) {
      final res = await http.get(
        Uri.parse('https://coursehubiitg.in/api/schedule/$formattedDate'),
        headers: {'Authorization': header},
      );
      scheduleList = [];
      decodedResponse = json.decode(res.body) as List<dynamic>;
      for (var schedule in decodedResponse) {
        scheduleList.add(Schedule.fromJson(schedule));
      }

      scheduleList.sort(
            (a, b) {
          return a.from.compareTo(b.from);
        },
      );

      CacheStore.schedule[dayName]=scheduleList;
    }

  } catch (e) {
    rethrow;
  }
}
