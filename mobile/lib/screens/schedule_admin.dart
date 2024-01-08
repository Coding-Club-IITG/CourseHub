import 'package:calendar_date_picker2/calendar_date_picker2.dart';
import 'package:flutter/material.dart';

import '../database/cache_store.dart';
import '../widgets/common/nav_bar.dart';

class ScheduleAdmin extends StatefulWidget {
  const ScheduleAdmin({super.key});

  @override
  State<ScheduleAdmin> createState() => _ScheduleAdminState();
}

class _ScheduleAdminState extends State<ScheduleAdmin> {
  final themeColor = CacheStore.attendanceColor;
  List<DateTime?> _dates=[];
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Ink(
          color: Colors.black,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const NavBar(),
              const SizedBox(
                height: 32,
              ),
              Padding(
                padding: const EdgeInsets.only(left: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                      Row(
                children: [
                  GestureDetector(child: const Icon(Icons.arrow_back,size: 22,color: Colors.white,),),
                  const Text('Edit Schedule', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),),
                ],
              ),
              const SizedBox(
                      height: 32,
                    ),
                    const Text('3rd Semester', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400),),
                    const Text('Course Name', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700, color: Color.fromRGBO(237, 244, 146, 1)),),
                    const SizedBox(
                      height: 15,
                    ),
                    CalendarDatePicker2(config: CalendarDatePicker2Config(
                      controlsTextStyle: const TextStyle(color: Colors.white, fontSize: 20),
                      calendarType: CalendarDatePicker2Type.multi,
                      disabledDayTextStyle: const TextStyle(color: Colors.white, fontSize: 16),
                      dayTextStyle: const TextStyle(color: Colors.white),
                      weekdayLabels: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
                      weekdayLabelTextStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.w400),
                      centerAlignModePicker: true,
                      disableModePicker: true,
                      yearTextStyle: const TextStyle(fontSize: 20),
                      selectedDayHighlightColor:const Color.fromRGBO(237, 244, 146, 1),
                      selectedDayTextStyle: const TextStyle(fontSize: 16, color: Colors.black),
                    ), 
                    value: _dates,
                    onValueChanged: (dates){
                      _dates=dates;
                      showScheduleDialogBox(context, 'Schedule');
                    },
                    )
                  ],
                ),
              )
            ],
          ),
        ),
      ),
    );
  }
}

Future<void> showScheduleDialogBox(BuildContext context, String title)async{
  return showDialog(context: context, builder: (context){
    return AlertDialog(
      actionsPadding: const EdgeInsets.all(10),
      backgroundColor: const Color.fromRGBO(49, 49, 49, 1),
      actionsAlignment: MainAxisAlignment.start,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(0)),
      actions: [
        Text(title, style: const TextStyle(fontSize: 16, color: Color.fromRGBO(237,244,146,1)),),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text('Time', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),),
            GestureDetector(child: const Text('Start Time', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1))),onTap: (){
             showCustomTimePicker(context);
            }, )
          ],
        )
      ],
    );
  });
}

Future<void> showCustomTimePicker(BuildContext context){
  return showTimePicker(context: context, 
  barrierColor: Colors.black,
  initialTime: TimeOfDay.now(), builder: (context, child) => Theme(
    data: ThemeData(dialogTheme: DialogTheme(backgroundColor: Colors.black), timePickerTheme: TimePickerThemeData(backgroundColor: Colors.black)),
    child: TimePickerDialog(
      initialTime: TimeOfDay.now()),
  ),);
}