import 'package:flutter/material.dart';
import '../database/cache_store.dart';
import '../widgets/common/nav_bar.dart';
import '../widgets/schedule_admin/custom_time_picker.dart';
import '../widgets/schedule_admin/date_picker.dart';
import '../widgets/schedule_admin/schedule_dialog_box.dart';

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
                    getCustomDatePicker((dates) {
                      _dates=dates;
                      showScheduleDialogBox(context,Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Schedule', style: TextStyle(fontSize: 16, color: Color.fromRGBO(237,244,146,1)),),
                          const SizedBox(height: 8,),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('Time', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),),
                              GestureDetector(child: const Text('Start Time', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1))),onTap: (){
                                showCustomTimePicker(context);
                              },),
                              GestureDetector(child: const Text('End Time', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1))),onTap: (){
                                showCustomTimePicker(context);
                              },),
                            ],
                          ),
                          const SizedBox(height: 8,),
                          GestureDetector(child: const Text('Location', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1))),onTap: (){
                            // TODO: Implement Location feature!
                          },),
                        ],
                      ), (){
                        // TODO: Implement cancel functionality here!
                      }, (){
                        // TODO: Implement confirm functionality here!
                      });
                    }, _dates),
                    const SizedBox(height: 25,),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        GestureDetector(
                          child: Container(
                            height: 40,
                            width: 40,
                            decoration: const BoxDecoration(
                              shape: BoxShape.circle,
                              color: Color.fromRGBO(37, 37, 37, 1),
                            ),
                            child: const Icon(Icons.lock_reset, color: Color.fromRGBO(237, 244, 146, 1),),
                          ),
                        ),
                        const SizedBox(width: 8,),
                        ElevatedButton(onPressed: (){
                          showScheduleDialogBox(context, Column(
                            mainAxisAlignment: MainAxisAlignment.start,
                            children: [
                              const Text('Confirm Changes', style: TextStyle(fontSize: 16, color: Color.fromRGBO(237,244,146,1)),),
                              const SizedBox(height: 8,),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Classes Added: ', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),),
                                  // There is some problem in getting this list! It has to be fixed!
                                  Expanded(
                                    child: ListView.builder(scrollDirection:Axis.horizontal, itemCount: _dates.length, itemBuilder: (context, index){
                                      if(_dates[0]==null){
                                        return const Text('No dates selected', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),);
                                      }
                                      return Text(_dates[index]!.day.toString(), style: const TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),);
                                    }),
                                  ),
                                ],
                              ),
                              const Text('Dates Removed: ', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),),
                              const Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Notify Others ', style: TextStyle(fontSize: 16, color: Color.fromRGBO(165, 165, 165, 1)),),
                                  // TODO: Implement notify feature here!
                                ],
                              )
                            ],
                          ), (){
                            // TODO: Implement cancel functionality here!
                          }, (){
                            // TODO: Implement confirm functionality here!
                          });
                          },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color.fromRGBO(37, 37, 37, 1)
                            ),
                            child: const Text('Save Changes', style: TextStyle(fontSize:12, color: Color.fromRGBO(237, 244, 146, 1), fontWeight: FontWeight.w400),))
                      ],
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