import 'package:flutter/material.dart';
import 'package:calendar_date_picker2/calendar_date_picker2.dart';

typedef OnValueChangedTYpe=Function(List<DateTime?> dates);

Widget getCustomDatePicker(OnValueChangedTYpe onValueChanged, List<DateTime?> value){
  return CalendarDatePicker2(config: CalendarDatePicker2Config(
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
  value: value,
    onValueChanged: onValueChanged,
  );
}