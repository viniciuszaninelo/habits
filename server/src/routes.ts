import dayjs from 'dayjs'
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from "./lib/prisma"

export async function appRoutes(app: FastifyInstance) {
  app.post('/habits',async (req) => {
  const createHabitBody = z.object({
    title: z.string(),
    weekDays: z.array(z.number().min(0).max(6))// [0,1,2] => Domingo, Segunda e Terça ...
  })
    const {title,weekDays } = createHabitBody.parse(req.body)

    const today = dayjs().startOf('day').toDate()

    await prisma.habit.create({
      data: {
        title,
        created_at: today,  
        weekDays: {
          create: weekDays.map(weekDay => {
            return {
              week_day: weekDay,
            }
          }) 
        }
      }
    })
  })

  app.get('/day', async (req) => {
    const getDayParams = z.object({
      date: z.coerce.date()
    })

    const { date } = getDayParams.parse(req.query)

    const parseDate = dayjs(date).startOf('day')
    const week_Day  = parseDate.get('day')
    // Eu quero duas informações:
    // 1 - todos os hábitos possiveis 
    // 2 - hábitos que já foram completados

    const possibleHabits = await prisma.habit.findMany({
        // primeira coisa que sera preciso eu verificar é: SE A DATA DE CRIACAO DO HÁBITO É MENOR OU IGUAL A DATA ATUAL
      where: {
        created_at: {
          lte: date,
        },
        weekDays: {
          // PELO MENOS 1 VAI PREENCHER MEUS REQUISITOS - SOME
          some: { 
            week_day: week_Day,
          }
        }
      }
    })

    const day = await prisma.day.findUnique({
      where: {
        date: parseDate.toDate(),
      },
      include: {
        dayHabits: true,
      }
    })

    const completedHabits = day?.dayHabits.map( dayHabit => {
      return dayHabit.habit_id
    })

    return {
      possibleHabits,
      completedHabits,
    }
  })

  // route completed or not completed
  app.patch('/habits/:id/toggle', async (req) => {
    //route param => parametro de identificação 
    const toggleHabitParams = z.object({
      id:  z.string().uuid(),
    })
    const { id } = toggleHabitParams.parse(req.params)

    const today  = dayjs().startOf('day').toDate()

    let day = await prisma.day.findUnique({
      where: {
        date: today,
      }
    })
    
    if(!day) {
      day = await prisma.day.create({
        data: {
          date: today,
        }
      })
    }

    const dayHabit = await prisma.dayHabit.findUnique({
      where: {
        day_id_habit_id: {
          day_id: day.id,
          habit_id: id,
        }
      }
    })

    if (dayHabit) {
      //remover marcação de completo
      await prisma.dayHabit.delete({
        where: {
          id: dayHabit.id,
        }
      })
    } else {     //completar o habito 
      await prisma.dayHabit.create({
        data: {
          day_id: day.id,
          habit_id: id,
        }
      })
    }
  })

  //list 
  app.get('/summary',async () => {

    const summary = await prisma.$queryRaw`
      SELECT 
        D.id, 
        D.date, 
        (
          SELECT 
            cast(count(*) as float)
          FROM day_habits DH
          WHERE DH.day_id = D.id
        ) as completed,
        (
          SELECT 
            cast(count(*) as float)
          FROM habit_week_days HWD
          JOIN habits H 
            ON H.id = HWD.habit_id
          WHERE 
            HWD.week_day = cast(strftime('%w', D.date/1000.0, 'unixepoch') as int)
            AND H.created_at <= D.date
        ) as amount
        FROM days D
    `
    return summary
  })
}
